
require('dotenv').config()   // for .env file
const express= require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
/*
  // first way:
 const md5= require('md5')  // for hashing password/message

 const encrypt= require('mongoose-encryption')   //for encrypting data field

 */
/*
    //second way:
const bcrypt = require('bcrypt')
const saltRounds = 10
*/

const session= require('express-session')
const passport= require('passport')
const passportLocalMongoose= require('passport-local-mongoose') //passport-local-mongoose, also perform salting nd hashing
// no need to require passport-local,bcoz it use local-passport


const GoogleStrategy = require('passport-google-oauth20').Strategy
const findOrCreate =require('mongoose-findorcreate')
const app = express()

app.set('view engine','ejs')
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended:true}))

//using or initializing session
app.use(session({
    secret: 'ratbat cat',
    resave: false,
    saveUninitialized: false,
    cookie: {}
    
  }))

  //using or initializing passport
  app.use(passport.initialize())
  app.use(passport.session())  //passport setting up session
  mongoose.set('strictQuery',true)


mongoose.connect('mongodb://127.0.0.1:27017/userDb')

const userSchema = new mongoose.Schema({
        email:String,
        password:String,
        googleId:String,
        secret:String
})


userSchema.plugin(passportLocalMongoose) // this line will perform hashing nd salting task ,nd save user in database
userSchema.plugin(findOrCreate)
// console.log(process.env.API_KEY)

/*
//encryption  of password field:
const secret = process.env.SECRET   // key  use to  encrypt database
userSchema.plugin(encrypt,{secret:secret,encryptedFields:['password']})

////encryption  of password and email field,if required using AES algo .
// userSchema.plugin(encrypt,{secret:secret,encryptedFields:['password','email']})
*/
const User =  new mongoose.model("user",userSchema)

// use passport local mongoose to create a local log in strategy and set a passport to serialize and deserialize user
passport.use(User.createStrategy());

// // use local type, serialize and deserialize of model for passport session 
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {

    process.nextTick(function() {
  
      return cb(null, {
  
        id: user.id,
  
        username: user.username,
  
        picture: user.picture
  
      });
  
    });
  
  });
  
  
  
  passport.deserializeUser(function(user, cb) {
  
    process.nextTick(function() {
  
      return cb(null, user);
  
    });
  
  })
    
    passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },

  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
      // need to install  "npm install mongoose-findorcreate"
    User.findOrCreate({ username: profile.emails[0].value,googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
))



app.get('/',(req,res)=>
{
    res.render('home')
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile','email'] }));

  app.get('/login',(req,res)=>
{
    res.render('login')
})

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get('/register',(req,res)=>
{
    res.render('register')
})

app.get('/secrets',(req,res)=>{

    User.find({'secret':{$ne:null}},(err,foundSecret)=>{
            if(err)
            {
                    console.log(err)
            }
            else
            {
                if(foundSecret){
                res.render('secrets',{usersPostedSecrets:foundSecret})
                }
            }
    })
 

})



// app.get('/secrets',(req,res)=>{
    // checking authenticated users
//     if(req.isAuthenticated())
//     {
//         res.render('secrets')
//     }
//     else{
//             res.redirect('/login')
//     }

// })

app.get("/logout",(req,res)=>{
    req.logOut((err)=>{
        if(!err)
        {
            res.redirect('/')
        }
        else
    {
        console.log(err)
    }
    })
  
})


app.get('/submit',(req,res)=>{
    if(req.isAuthenticated())
    {
        res.render('submit')
    }
    else{
            res.redirect('/login')
    }
})
//////////////////////////////////
/*
app.post("/register",(req,res)=>{

    const userName= req.body.username
    // const passWord =md5(req.body.password)
    // encrypt pswrd using bcrypt hashing
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {

        const newUser = new User(
            {
                email:userName,
                password:hash
            }
        ) 
        // password encrypt with mongoose save() method 
        newUser.save((err)=>{
            if(err)
            {
                console.log(err)
               
            }
            else{
                res.render('secrets') 
            }
        })
        
    });
    

    
})

app.post("/login",(req,res)=>{
 
    const emaiL = req.body.username
    // const passWord=md5(req.body.password)
    const passWord =req.body.password

    // password decrypt with mongoose find() method ,using secret key :
    User.findOne({email:emaiL},(err,foundOne)=>
    {
            if(foundOne)

            {   // checking bcrypt password
                bcrypt.compare(passWord, foundOne.password, (req,result)=> {
                
                    if(result=== true)
                {
               
                         res.render('secrets')  
                
                }
                    else{
                       
                        console.log("password not matched")
                }
                })

            }
            else
            {
                    console.log(err)
            }
        })
    })




*/

//////////////////////////////////////////////////////////////////

app.post('/register',(req,res)=>{
// passport-local mongoose for register() method,it create,save and check new user,work as a middle-man
    User.register({username:req.body.username},req.body.password,(err,user)=>{
        if(err)
        {
                console.log(err)
                res.redirect('/register')
        }
        else
       {     // if no error ,user will authenticate user by passport,
        // 'local' is a type of authentication   managed to successfully setup a cookie that saved their current logged in session
            passport.authenticate('local')(req,res,()=>{
                res.redirect('/secrets')
            })
      
                
        }
    })

})

app.post('/login', passport.authenticate('local', 
{ successRedirect: '/secrets', failureRedirect: '/login' }));


app.post("/submit",(req,res)=>{
    const submittedSecret = req.body.secret
    console.log(req.user.id)
    User.findById(req.user.id,(err,foundOne)=>{
            if(err)
            {
                    console.log(err)
            }
            else{
                    if(foundOne){

                    foundOne.secret= submittedSecret
                    foundOne.save(()=>{
                        res.redirect('/secrets')
                    
                    })
                }
            }
    })

})



app.listen('3000',()=>{
    console.log('app listen at port 3000')
})