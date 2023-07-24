
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

var FacebookStrategy = require('passport-facebook').Strategy;
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
    // cookie: {}
    
  }))

  //using or initializing passport
  app.use(passport.initialize())
  app.use(passport.session())  //passport setting up session
  mongoose.set('strictQuery',true)


// mongoose.connect('mongodb://127.0.0.1:27017/userDb')

const mongoUrl=`mongodb+srv://${process.env.CLIENT_IDm}/userDb`

mongoose.connect(mongoUrl);
const userSecret = new mongoose.Schema({
secret :String

})
// const UserSecretModel = mongoose.model('UserSecretModel', userSecret);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: userSecret,
    facebookId: String,
});



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

//// **Note : use local type, serialize and deserialize of model for passport session 

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

//// **Note : use hosted type, serialize and deserialize of model for passport session 
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
    

    // this callback url  use for local server :
    // callbackURL: "https://localhost:3000/auth/google/secrets",
    passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_IDg,
    clientSecret: process.env.CLIENT_SECRETg,
    callbackURL: "https://secret-post.onrender.com/auth/google/secrets",
    // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",

    // enableProof: true
  
  },

  function(accessToken, refreshToken, profile, cb) {
    console.log(profile+" google profile")
      // need to install  "npm install mongoose-findorcreate"
    User.findOrCreate({ username: profile.emails[0].value,googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
))

////////////////////////////////////////
  // this callback url  use for local server :
//    callbackURL: "https://secret-post.onrender.com/auth/facebook/secrets",
passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_IDf,
    clientSecret: process.env.CLIENT_SECRETf,
    callbackURL: "https://secret-post.onrender.com/auth/facebook/secrets",
    enableProof: true
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile +" facebook profile")
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
///////////////////////////////////////////

app.get('/',(req,res)=>
{
    res.render('home')
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile','email'] }));

  // app.route('/auth/google')

  // .get(passport.authenticate('google', {

  //   scope: ['profile']

  // }));

  app.get('/auth/facebook',
  passport.authenticate('facebook'));

  app.get('/login',(req,res)=>
{
    res.render('login')
})

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

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

// app.get('/secrets',(req,res)=>{

//     User.find({'secret':{$ne:null}},(err,foundSecret)=>{
//             if(err)
//             {
//                     console.log(err)
//             }
//             else
//             {
//                 if(foundSecret){
//                 res.render('secrets',{usersPostedSecrets:foundSecret})
//                 }
//             }
//     })
 

// })


//////////////////////////////
app.get('/secrets', (req, res) => {
  if (req.isAuthenticated()) {
    User.find({ secret: { $ne: null } }, function (err, foundSecret) {
      if (err) {
        console.log(err);
      } else {
        if (foundSecret) {
          res.render('secrets', { usersPostedSecrets:foundSecret});
        }
      }
    });
  } else {
    res.redirect('/login');
  }
});


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





// app.post("/submit", (req, res) => {
//     if (!req.isAuthenticated()) {
//         return res.redirect("/login");
//     }

//     const submittedSecret = req.body.secret;
//     console.log(submittedSecret);
//     console.log(req.user.id);

//     User.findById(req.user.id, (err, foundOne) => {
//         if (err) {
//             console.error("Error finding user:", err);
//             return res.redirect("/secrets");
//         }

//         if (!foundOne) {
//             console.error("User not found");
//             return res.redirect("/secrets");
//         }

//         // Push the new secret to the existing secrets array
//         foundOne.secret.push({ secret: submittedSecret });

//         foundOne.save((err) => {
//             if (err) {
//                 console.error("Error saving secret:", err);
//                 return res.redirect("/secrets");
//             }

//             console.log("Secret saved:", submittedSecret);
//             res.redirect("/secrets");
//         });
//     });
// });


app.post("/submit", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const submittedSecret = req.body.secret;
  console.log(submittedSecret);
  console.log(req.user.id);

  User.findById(req.user.id, (err, foundOne) => {
    if (err) {
      console.error("Error finding user:", err);
      return res.redirect("/secrets");
    }

    if (!foundOne) {
      console.error("User not found");
      return res.redirect("/secrets");
    }

    // Push the new secret to the existing secrets array
    foundOne.secret.secret = submittedSecret; // Save the submitted secret

    foundOne.save((err) => {
      if (err) {
        console.error("Error saving secret:", err);
        return res.redirect("/secrets");
      }

      console.log("Secret saved:", submittedSecret);
      res.redirect("/secrets");
    });
  });
});

app.listen('3000',()=>{
    console.log('app listen at port 3000')
})