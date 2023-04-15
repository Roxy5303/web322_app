var mongoose = require("mongoose");
var Schema = mongoose.Schema;

const env = require('dotenv');
const bcrypt = require('bcryptjs');
env.config();

var userSchema = new Schema({
    "userName" : {
        type: String,
        unique : true
    },
    "password" : String,
    "email" : String,
    "loginHistory" : [{
        "dateTime" : Date,
        "userAgent" : String
    }]
});

let User;

module.exports.initialize = function ()
{
    return new Promise(function (resolve, reject) 
    {
        let db = mongoose.createConnection("mongodb+srv://rahiraolji:mCwThpi6pyiceuC3@senecaweb.u2k5unl.mongodb.net/web322_week8");
        db.on('error', (err)=>
        {
            reject(err); // reject the promise with the provided error
        });
        db.once('open', ()=>
        {
           User = db.model("users", userSchema);
           resolve();
        });
    });
};

module.exports.registerUser = function(userData)
 {
    return new Promise(function(resolve,reject)
    {
        if(userData.password != userData.password2)
        {
            reject("Passwords do not match!!!!");
        }
        else
        {
            bcrypt.genSalt(10).then((salt) => {
            bcrypt.hash(userData.password,salt).then((hash) => {
            userData.password = hash;
            let newUser = new User(userData);
            newUser.save().then(() => {
                resolve();
            }).catch((err) => {
                if(err.code == 11000)
                {
                    reject("UserName is Already Taken");
                }
                else
                {
                    reject("There was an error creating the user:" + err);
                }
            })
        }).catch((err) => {
            console.log(err);
            reject("Error with passowrd encryption");
        })
    })
   }
})
}

module.exports.checkUser = function(userData)
{
    return new Promise(function(resolve,reject)
    {
        User.find({userName : userData.userName}).exec().then((users) => {
            if(users.length === 0)
            {
                reject("Unable to find user: " + userData.userName);
            }
            else
            {
                bcrypt.compare(userData.password,users[0].password).then((result) => {
                    if(result == true)
                    {
                        users[0].loginHistory.push({dateTime: (new Date()).toString(), userAgent: userData.userAgent});
                        User.updateOne({username: users[0].username},{
                            $set: {loginHistory: users[0].loginHistory}
                        }).exec().then(()=>{
                            resolve(users[0]);
                        }).catch((err) =>
                        {
                            reject("There was an error verifying the user: " + err);
                        })
                    }
                    else
                    {
                        reject("Incorrect Password for user: " + userData.userName);
                    }
                }).catch((err)=>{
                    reject("There was an error verifying the user" + err);
                })
            }
        }).catch((err)=>{
            reject("Unable to find user: " + userData.userName);
        })
    })
}