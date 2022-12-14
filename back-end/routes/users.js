const express = require("express")
const jwt = require("jsonwebtoken") // used for authentication with JSON Web Tokens
const passport = require("passport")
const router = express.Router()
const User = require("../models/userschema")
const bcrypt = require('bcrypt');
const multer = require('multer')
const multerS3 = require('multer-s3')
const S3Client = require("@aws-sdk/client-s3").S3Client

const { jwtOptions, jwtStrategy } = require("./jwt-config.js") // import setup options for using JWT in passport
const { body, validationResult } = require('express-validator');
passport.use(jwtStrategy)



const createS3Client = () => {
    return new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
    });
}

const s3 = createS3Client();
var upload = multer({
    storage: multerS3({
        s3: s3,
        acl: 'public-read',
        bucket: process.env.AWS_BUCKET_NAME,
        key: function (req, file, cb) {
            cb(null, file.originalname)
        },
    })
})



router.get('/', async (req, res) => {
    //route for retrieving the list of all users
    try {
        const users = await User.find()
        res.json(users)
    }
    catch (err) {
        res.json({ message: err.message, location: 'Retrieving users from DB' })
    }
})

//route for adding a new user (user registration page)
router.post('/register', upload.single('file'),
    body('emailID').trim().isEmail(),
    body('phone').isMobilePhone(),
    async (req, res) => {
        try {
            console.log(req)
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(200).json({ message: errors.array()[0].param });
            }
            const existingUser = await User.findOne({ emailID: req.body.emailID })
            if (existingUser) {
                return res.status(200).send({ success: false, message: "Email already in use" })
            }
            if (!existingUser) {
                bcrypt.hash(req.body.password, 10)
                    .then(hashedPassword => {
                        const newUser = new User({
                            fullname: req.body.fullname,
                            emailID: req.body.emailID,
                            password: hashedPassword,
                            dob: req.body.dob,
                            phone: req.body.phone,
                            imgPath: req.file.location
                        });
                        newUser.save()
                            .then(
                                () => {
                                    res.status(200).send({
                                        success: true,
                                        message: "User created successfully",
                                        emailID: req.body.emailID,
                                        password: req.body.password
                                    })
                                }
                            )
                    })
                    .catch(err => {
                        res.status(400).json({ message: err.message });
                        console.log(err)
                    })
            }
        }
        catch (err) {
            res.json({ message: err.message });
            console.log(err)
        }
    })
router.post('/login', body('emailID').isEmail(), async (req, res,) => {

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            //console.log(errors.array()[0].param)
            return res.status(200).json({ message: errors.array()[0].param });
        }

        if (!req.body.emailID || !req.body.password) {
            res
                .status(401)
                .json({ success: false, message: `No username or password supplied` })
        }

        //check if the user exists or not 
        const user = await User.findOne({ emailID: req.body.emailID })
        if (!user) {
            return res.status(200).send({ success: false, message: "User not found" })
            //throw new Error("User not found")
        }

        const dbPassword = user.password
        bcrypt.compare(req.body.password, dbPassword)
            .then(validPass => {
                if (!validPass) {
                    //throw new Error("Incorrect password, try again")
                    return res.status(200).send({ success: false, message: "Incorrect password" })
                }
                else {
                    const payload = {
                        id: user._id,
                        emailID: user.emailID
                    }
                    const accessToken = jwt.sign(payload, jwtOptions.secretOrKey, { expiresIn: "7d" })
                    res.status(200).send({
                        success: true,
                        emailID: req.body.emailID,
                        message: "Logged in successfully",
                        token: "Bearer " + accessToken
                    })
                }
            }
            )
            .catch(err => {
                res.status(400).json({ message: err.message });
                console.log(err)
            })

    }
    catch (err) {
        res.json({ message: err.message });
        console.log(err)
    }

})

router.get('/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let userId = decoded.id
        const user = await User.findById(userId)

        res.json({
            id: userId,
            fullname: user.fullname,
            emailID: user.emailID,
            phone: user.phone,
            img: user.imgPath
        })
    }
    catch (err) {
        res.json({ message: err.message })
    }
})

//need to check if we need this router later since the user profile is fetched after authentication
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
        res.json(user)
    }
    catch (err) {
        res.json({ message: err.message })
    }
})


router.patch('/:userId', upload.single('file'), body('emailID').isEmail(), body('phone').isMobilePhone(), async (req, res) => {
    //route for updating a user profile (edit profile page)
    console.log('imgPath:', req.file.location)
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({ message: errors.array()[0].param });
        }

        const updatedUser = await User.updateOne(
            { _id: req.params.userId },
            {
                $set: {
                    fullname: req.body.fullname,
                    emailID: req.body.emailID,
                    phone: req.body.phone,
                    imgPath: req.file.location
                }
            })
        res.json({ message: "ok" })
    }
    catch (err) {
        //console.log("here")
        console.log(err.message)
        res.json({ message: err.message })
    }

})

router.delete('/:userId', async (req, res) => {
    //route for deleting a user
    try {
        const removedUser = await User.remove({ _id: req.params.userId })
        res.json(removedUser)
    }
    catch (err) {
        res.json({ message: err.message })
    }
})



//--------------------------- SAVE POST ROUTERS RELATED TO USER -------------------------------------------------
router.get('/saved-posts/userId=:userId&postId=:postId', async (req, res) => {

    try {
        const user = await User.find(
            {
                _id: req.params.userId,
                savedPosts: req.params.postId
            }
        )

        res.json(user)
    }
    catch (err) {
        res.json({ message: err.message })
    }

})

router.delete('/saved-posts/userId=:userId&postId=:postId', async (req, res) => {

    try {
        const user = await User.updateOne(
            { _id: req.params.userId },
            { $pull: { savedPosts: req.params.postId } }
        )

        res.json(user)
    }
    catch (err) {
        res.json({ message: err.message })
    }

})

router.post('/saved-posts', async (req, res) => {

    try {
        const user = await User.findById(req.body.userId);
        user.savedPosts.push(req.body.postId)

        updatedUser = await user.save()

        res.json(updatedUser)
    }
    catch (err) {
        res.json({ message: err.message })
    }

})
module.exports = router;
