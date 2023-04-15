/*********************************************************************************
 *  WEB322 – Assignment 6
 *  I declare that this assignment is my own work in accordance with Seneca Academic Policy.
 *  No part of this assignment has been copied manually or electronically from any other source
 *  (including web sites) or distributed to other students.
 *
 *  Name: Rahi Kiransinh Raolji
 *  Student ID: 160169215
 *  Date: 14 April 2023
 *
 *  Cyclic Web App URL:
 *
 *  GitHub Repository URL: 
 *
 ********************************************************************************/
const express = require('express');
const blogData = require("./blog-service");
const multer = require("multer");
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const exphbs = require("express-handlebars");
const path = require("path");
const {mainModule} = require('process');
const stripJs = require('strip-js');
const authData = require('./auth-service.js');
const app = express();
const env = require('dotenv');
const clientSessions = require('client-sessions');
env.config();
const HTTP_PORT = process.env.PORT || 8080;

cloudinary.config({
  cloud_name: "dmmpv7xxz",
  api_key: "955468951464545",
  api_secret: "3knlJgcttwmEGEUE7-rwat6u1aA",
  secure: true,
});

const upload = multer();

app.use(clientSessions({
    cookieName: "session",
    secret: "Web322Assignment",
    duration: 2 * 60 * 1000,
    activeDuration: 1000 * 60
}));

function ensureLogin(req,res,next) {
    if(!req.session.user)
    {
        res.redirect("/login");
    }
    else
    {
        next();
    }
}

app.use(function(req, res, next) {
    res.locals.session = req.session;
    next();
});
  
// setup a 'route' to listen on the default url path
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));

app.use(function(req,res,next){
    let route = req.path.substring(1);
    app.locals.activeRoute = (route == "/") ? "/" : "/" + route.replace(/\/(.*)/, "");
    app.locals.viewingCategory = req.query.category;
    next();
});

app.engine('.hbs', exphbs.engine({ extname: '.hbs',
helpers: {
    navLink: function(url, options){
        return '<li' + 
            ((url == app.locals.activeRoute) ? ' class="active" ' : '') + 
            '><a href="' + url + '">' + options.fn(this) + '</a></li>';
    },
    equal: function (lvalue, rvalue, options) {
        if (arguments.length < 3)
            throw new Error("Handlebars Helper equal needs 2 parameters");
        if (lvalue != rvalue) {
            return options.inverse(this);
        } else {
            return options.fn(this);
        }
    },
    safeHTML: function(context){
        return stripJs(context);
    },
    formatDate: function(dateObj){
    let year = dateObj.getFullYear();
    let month = (dateObj.getMonth() + 1).toString();
    let day = dateObj.getDate().toString();
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2,'0')}`;
}
}}));

app.set('view engine', '.hbs');
app.get("/", (req, res) => {
    res.redirect("/blog");
});

app.get("/about",(req,res) => {
    res.render('about');
});

app.get('/blog', async (req, res) => {

        // Declare an object to store properties for the view
        let viewData = {};
    
        try{
    
            // declare empty array to hold "post" objects
            let posts = [];
    
            // if there's a "category" query, filter the returned posts by category
            if(req.query.category){
                // Obtain the published "posts" by category
                posts = await blogData.getPublishedPostsByCategory(req.query.category);
            }else{
                // Obtain the published "posts"
                posts = await blogData.getPublishedPosts();
            }
    
            // sort the published posts by postDate
            posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));
    
            // get the latest post from the front of the list (element 0)
            let post = posts[0]; 
    
            // store the "posts" and "post" data in the viewData object (to be passed to the view)
            viewData.posts = posts;
            viewData.post = post;
    
        }catch(err){
            viewData.message = "no results";
        }
    
        try{
            // Obtain the full list of "categories"
            let categories = await blogData.getCategories();
    
            // store the "categories" data in the viewData object (to be passed to the view)
            viewData.categories = categories;
        }catch(err){
            viewData.categoriesMessage = "no results"
        }
    
        // render the "blog" view with all of the data (viewData)
        res.render("blog", {data: viewData})
    
});

app.get("/posts", ensureLogin ,(req,res) => {
    let querypro = null;
    if(req.query.category)
    {
        querypro = blogData.getPostsByCategory(req.query.category);
    }
    else if(req.query.minDate)
    {
        querypro = blogData.getPostsByMinDate(req.query.minDate);
    }
    else
    {
        querypro = blogData.getAllPosts();
    }
    querypro.then((data) => {
        if(data.length > 0)
        {        
            res.render("posts", {posts: data});
        }
        else
        {
            res.render("posts", {message: "no results"});
        }
    }).catch((err)=>{
        res.render("posts", {message: "no results"});
    })
});

app.get("/post/:id",ensureLogin,(req,res)=>{
    blogData.getPostById(req.params.id).then((data)=>
    {
        res.json(data);
    })
    .catch((err)=>{
        res.json({Message: "Error"});
    });
});

app.get("/categories/delete/:id",ensureLogin,(req,res) => {
    blogData.deleteCategoryById(req.params.id).then(() =>
    {
        res.redirect("/categories");
    }).catch((err)=>
    {
        res.status(500).send("Unable to remove Category");
    });
});

app.get("/post/delete/:id",ensureLogin,(req,res) => {
    blogData.deletePostById(req.params.id).then(() =>
    {
        res.redirect("/posts"); 
    }).catch((err)=>
    {
        res.status(500).send("Unable to remove Post");
    });
});

app.get("/categories",ensureLogin,(req,res) => {
    blogData.getCategories() .then((data) => {
        if(data.length > 0)
        {
            res.render("categories", {categories: data});
        }
        else
        {
            res.render("categories", {message: "no results"});
        }
    })
    .catch((err) => {
        res.render("categories", {message: "no results"});
    });
});

app.get("/posts/add",ensureLogin,(req,res)=>
{
    blogData.getCategories().then((data)=>
    {
        res.render("addPost", {layout:"main.hbs",categories: data});
    }).catch((err)=>{
        res.render("addPost", {categories: []}); 
    })
    
});

app.get("/categories/add",ensureLogin,(req,res)=>
{
    res.render("addCategory");
});

app.get('/blog/:id',ensureLogin, async (req, res) => {

    // Declare an object to store properties for the view
    let viewData = {};

    try{

        // declare empty array to hold "post" objects
        let posts = [];

        // if there's a "category" query, filter the returned posts by category
        if(req.query.category){
            // Obtain the published "posts" by category
            posts = await blogData.getPublishedPostsByCategory(req.query.category);
        }else{
            // Obtain the published "posts"
            posts = await blogData.getPublishedPosts();
        }

        // sort the published posts by postDate
        posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));

        // store the "posts" and "post" data in the viewData object (to be passed to the view)
        viewData.posts = posts;

    }catch(err){
        viewData.message = "no results";
    }

    try{
        // Obtain the post by "id"
        viewData.post = await blogData.getPostById(req.params.id);
    }catch(err){
        viewData.message = "no results"; 
    }

    try{
        // Obtain the full list of "categories"
        let categories = await blogData.getCategories();

        // store the "categories" data in the viewData object (to be passed to the view)
        viewData.categories = categories;
    }catch(err){
        viewData.categoriesMessage = "no results"
    }

    // render the "blog" view with all of the data (viewData)
    res.render("blog", {data: viewData})
});

app.post("/posts/add",ensureLogin,upload.single("featureImage"),(req,res)=>
{
    if(req.file){
        let streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream(
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );
    
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };
    
        async function upload(req) {
            let result = await streamUpload(req);
            console.log(result);
            return result;
        }
    
        upload(req).then((uploaded)=>{
            processPost(uploaded.url);
        });
    }else{
        processPost("");
    }
     
    function processPost(imageUrl){
        req.body.featureImage = imageUrl;
        blogData.addPost(req.body).then(()=>{
            res.redirect("/posts")
        }).catch((err)=>{
            res.status(500).send(err);
        })
    } 
}); 

app.post("/categories/add",(req,res) => {
    blogData.addCategory(req.body).then(()=>{
        res.redirect("/categories");
    })
});

app.get("/login",(req,res) => {
    res.render('login',{layout:'main'});
})

app.get("/register",(req,res)=>{
    res.render('register',{layout:'main'});
})

app.post("/register",(req,res) => {
    authData.registerUser(req.body).then((data) => {
        res.render('register',{successMessage:"User Created"});
    }).catch((err)=>{
        res.render('register',{
            errorMessage: err,
            userName: req.body.userName
        })
    })
})

app.post("/login",(req,res) => {
    req.body.userAgent = req.get('User-Agent');
    authData.checkUser(req.body).then((user) => {
        req.session.user = {
            userName: user.userName,
            email: user.email,
            loginHistory: user.loginHistory,
        }
        res.redirect('/posts');
    }).catch((err)=>{
        res.render('login',{
            errorMessage: err,
            userName: req.body.userName
        })
    })
})

app.get("/logout",(req,res)=>{
    req.session.reset();
    res.redirect('/');
})

app.get("/userHistory",ensureLogin,(req,res)=> {
    res.render('userHistory',{layout:'main'});
})

// setup http server to listen on HTTP_PORT
function onStart()
{
    console.log("Express http server listening on " + HTTP_PORT + " 🦻🏻🦻🏻🦻🏻");
}

app.use((req, res) => {
    res.status(404).send("Page Not Found");
 })

 blogData.initialize()
 .then(authData.initialize)
 .then(function(){
     app.listen(HTTP_PORT, function(){
         console.log(HTTP_PORT, onStart())
     });
 }).catch(function(err){
     console.log("unable to start server: " + err);
 });