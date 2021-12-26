const express = require('express');
const app = express();
const session = require('express-session');
const port = process.env.PORT || 3000;
const alert = require('alert');
var cookieParser = require('cookie-parser');
//const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const mysql = require('mysql');
const fileUpload = require('express-fileupload');
const util = require('util');
const path = require('path');

const connection = mysql.createConnection({
    host: 'eu-cdbr-west-01.cleardb.com',
    user: 'b3a939da38a4c8',
    password: '59e208d0',
    database: 'heroku_2dbe65ac07f9310'
});

connection.connect(function() {
    console.log("Database connected successfully");
});

app.set('view engine', 'ejs');
app.use(cookieParser()); 

app.use(session({ cookie: { maxAge: 10800000 }, 
    secret: 'woot',
    resave: false, 
    saveUninitialized: false})
)

app.use(express.static(__dirname + '/resources'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileUpload());

app.get('/', function(req, res) {
    res.render('register');
});

app.get('/home', function(req,res) {
    var userdata = req.session.user;
    if(userdata) {
        console.log(userdata);
        res.render('home',{userdata: userdata});
    }
    else{
        res.redirect("/login")
    }
});

app.post('/', function (req, res) {  
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var email = req.body.email;
    var phone = req.body.nr_telefon;
    var data = req.body.bday;
    var parola = req.body.pass;
    var department = req.body.department;
    const name_pattern = /^((([A-Z])([a-z]+)( ([A-Z])([a-z]+))*)+)$/;
    if(!name_pattern.test(firstname)) {
        alert("The name must start with an uppercase, the following letters must be lowercase, the name must have at least 2 letters and cannot contain numbers or symbols");
    }
    else {
        if(!name_pattern.test(lastname)) {
            alert("The name must start with an uppercase, the following letters must be lowercase, the name must have at least 2 letters and cannot contain numbers or symbols");
        }
        else {
            const email_pattern = /^[A-Za-z](.+)@([A-Za-z]+)\.([A-Za-z]+)$/;
            if(!email_pattern.test(email)) {
                alert("Introduce a valid email address");
            }
            else {
                const tel_pattern = /^07[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$/;
                if(!tel_pattern.test(phone)) {
                    alert("Introduce a valid phone number (format:07xxxxxxxx)");
                }
                else {
                    if(!data) {
                        alert("Please select a valid date");
                    }
                    else {
                        const pass_pattern = /^.+.+.+.+.+.+.+.+$/;
                        if(!pass_pattern.test(parola)) {
                            alert("The password should contain at least 8 characters");
                        }
                        else {
                            if(!department) {
                                alert("Please select a department");
                            }
                            else {
                                connection.query('SELECT COUNT(*) AS nr FROM user WHERE email = ?', email, (error,rows) => {
                                    if(error) {
                                        console.log(error);
                                        alert("An error occured while submitting the data, please try again");
                                        res.render('register')
                                    }
                                    if(!error) {
                                        if(rows[0].nr) {
                                            alert("An account with this email already exists");
                                        }
                                        else {
                                            var id = 0;
                                            connection.query("SELECT * FROM departament WHERE nume = ?",
                                            department, 
                                            (error,rows) => {
                                                if(error) {
                                                    console.log(error);
                                                    alert("An error occured while submitting the data, please try again");
                                                    res.render('register')
                                                }
                                                if(!error) {
                                                    id = rows[0].dep_id;
                                                    bcrypt.hash(parola, saltRounds, (err, hash) => {
                                                        connection.query("INSERT INTO user (email, nume, prenume, telefon, dep_id, data_nasterii, parola, activated) VALUES (?,?,?,?,?,?,?,?)",
                                                        [email, lastname, firstname, phone, id, data, hash, 0], 
                                                        (error,rows) => {
                                                            if(!error) {
                                                                alert("Data submitted successfully. Pending approval from the admin.");
                                                                res.redirect('/login')
                                                            }
                                                            else {
                                                                console.log(error);
                                                                alert("An error occured while submitting the data, please try again");  
                                                                res.render('register');
                                                            }
                                                        })
                                                    });

                                                }
                                            })
                                        }
                                    }
                                })
                            }
                        }
                    }
                }
            }
        }
    }


 })  

 app.post('/login', function(req, res) {
    var email = req.body.email;
    var parola = req.body.pass;
    if(!email) {
        alert("Please insert an email address");
    }
    else {
        if(!parola) {
            alert("Please insert the password");
        }
        else {
            connection.query('SELECT COUNT(*) AS nr FROM user WHERE email = ?', email, (error,rows) => {
                if(error){
                    console.log(error);
                    alert("Login failed, please try again");
                    res.render('login');
                }
                if(!error) {
                    if(rows[0].nr == 0) {
                        alert("There is no account associated with this email");
                    }
                    else {
                        connection.query("SELECT * FROM user WHERE email = ?", email, (error,userdata) => {
                            if(error) {
                                console.log(error);
                                alert("Login failed, please try again");
                                res.render('login');
                            }
                            if(!error) {
                                bcrypt.compare(parola, userdata[0].parola, function(err, rez) {
                                    if(!rez) {
                                        alert("Wrong password");
                                        res.render('login');
                                    }
                                    else {
                                        if(userdata[0].activated == 0) {
                                            alert("Waiting for admin approval for using this account");
                                            res.render('login');
                                        }
                                        else {
                                            req.session.user = userdata[0];
                                            res.redirect("/home");
                                        }
                                    }
                                });
                            }
                        })
        
                    }
                }
            })
        }
    }
})

app.get('/login', function(req, res) {
    res.render('login');
})

app.get('/addtask', function(req, res) {
    if(req.session.user.cod_rol) {
        res.render('addtask');
    }
})

app.get('/colleagues', function(req, res) {
    if(req.session.user) {
        id = req.session.user.dep_id;
        connection.query("SELECT * FROM user task WHERE dep_id = ?",
        id,
        (error,data) => {
            if(error) {
                console.log(error);
                alert("An error occured while retrieving the data, please try again later");
            }
            if(!error) {
                res.render('colleagues',{data:data});
            }
        });
    }
})

app.get('/availabletasks', function(req, res) {
    if(req.session.user) {
        id = req.session.user.dep_id;
        connection.query("SELECT * FROM task WHERE id_dep = ? AND NOT status = ?",
        [id,2],
        (error,data) => {
            if(error) {
                console.log(error);
                alert("An error occured while retrieving the data, please try again later");
            }
            if(!error) {
                res.render('availabletasks',{data:data});
            }
        });
    }
})

app.get('/mytasks', function(req, res) {
    if(req.session.user) {
        id = req.session.user.user_id;
        connection.query("SELECT * FROM task WHERE id_user_f = ? OR id_user_s = ? OR id_user_t = ?",
        [id,id,id],
        (error,data) => {
            if(error) {
                console.log(error);
                alert("An error occured while retrieving the data, please try again later");
            }
            if(!error) {
                res.render('mytasks',{data:data});
            }
        });
    }
})

app.post('/addtask', function (req, res) {  
    var name = req.body.name;
    var description = req.body.description;
    var time = req.body.time;
    var nrofpersons = req.body.nrofpersons;
    var attach = req.body.file;
    var department = req.body.department;
    const name_pattern = /^(([A-Za-z])+.+.+)$/;
    const description_pattern = /^(([A-Za-z])+.{14,59})$/;
    if(!name_pattern.test(name)) {
        alert("The name must start with a letter, and have at least 3 characters");
    }
    else {
        if(!description_pattern.test(description)) {
            alert("The description must start with a letter, and have between least 15 and 60 characters");
        }
        else {
            if(!time) {
                alert("Introduce estimated time");
            }
            else {
                if(!department) {
                    alert("Please select a department");
                }
                else {
                    var id = 0;
                    connection.query("SELECT * FROM departament WHERE nume = ?",
                    department, 
                    (error,rows) => {
                    if(error) {
                        console.log(error);
                        alert("An error occured while submitting the data, please try again");
                        res.render('addtask');
                    }
                    id = rows[0].dep_id;
                    if(!error) {
                        connection.query("INSERT INTO task (denumire, descriere, timp, nr_persoane, id_dep, attach,status) VALUES (?,?,?,?,?,?,?)",
                        [name,description,time,nrofpersons,id,attach,0], (error,rows) => {
                            if(!error) {
                                alert("Data submitted successfully.");
                                res.render('addtask');
                            }
                            else {
                                console.log(error);
                                alert("An error occured while submitting the data, please try again");  
                                res.render('addtask');
                            }
                            
                        })
                    }
                    })
                }
            }
        }
    }


 })  

app.listen(port);
console.log('Server is listening on port ', port);