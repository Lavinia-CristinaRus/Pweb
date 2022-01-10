const express = require('express');
const app = express();
const session = require('express-session');
const port = process.env.PORT || 3000;
const alert = require('alert');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const mysql = require('mysql');


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


app.get('/', function(req, res) {
    res.render('register',{error:null});
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
        res.render('register',{error:"The name must start with an uppercase, the following letters must be lowercase, the name must have at least 2 letters and cannot contain numbers or symbols"});
    }
    else {
        if(!name_pattern.test(lastname)) {
            res.render('register',{error:"The name must start with an uppercase, the following letters must be lowercase, the name must have at least 2 letters and cannot contain numbers or symbols"});
        }
        else {
            const email_pattern = /^[A-Za-z](.+)@([A-Za-z]+)\.([A-Za-z]+)$/;
            if(!email_pattern.test(email)) {
                res.render('register',{error:"Introduce a valid email address"});
            }
            else {
                const tel_pattern = /^07[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$/;
                if(!tel_pattern.test(phone)) {
                    res.render('register',{error:"Introduce a valid phone number (format:07xxxxxxxx)"});
                }
                else {
                    if(!data) {
                        res.render('register',{error:"Please select a valid date"});
                    }
                    else {
                        const pass_pattern = /^.+.+.+.+.+.+.+.+$/;
                        if(!pass_pattern.test(parola)) {
                            res.render('register',{error:"The password should contain at least 8 characters"});
                        }
                        else {
                            if(!department) {
                                res.render('register',{error:"Please select a department"});
                            }
                            else {
                                connection.query('SELECT COUNT(*) AS nr FROM user WHERE email = ?', email, (error,rows) => {
                                    if(error) {
                                        console.log(error);
                                        res.render('register',{error:"An error occured while submitting the data, please try again"});
                                    }
                                    if(!error) {
                                        if(rows[0].nr) {
                                            res.render('register',{error:"An account with this email already exists"});
                                        }
                                        else {
                                            var id = 0;
                                            connection.query("SELECT * FROM departament WHERE nume = ?",
                                            department, 
                                            (error,rows) => {
                                                if(error) {
                                                    console.log(error);
                                                    res.render('register',{error:"An error occured while submitting the data, please try again"});
                                                }
                                                if(!error) {
                                                    id = rows[0].dep_id;
                                                    bcrypt.hash(parola, saltRounds, (err, hash) => {
                                                        connection.query("INSERT INTO user (email, nume, prenume, telefon, dep_id, data_nasterii, parola, activated) VALUES (?,?,?,?,?,?,?,?)",
                                                        [email, lastname, firstname, phone, id, data, hash, 0], 
                                                        (error,rows) => {
                                                            if(!error) {
                                                                res.render('register',{error:"Data submitted successfully. Pending approval from the admin."});
                                                            }
                                                            else {
                                                                console.log(error);
                                                                res.render('register',{error:"An error occured while submitting the data, please try again"});  
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
 
 app.get('/login', function(req, res) {
    res.render('login',{error:null});
})

 app.post('/login', function(req, res) {
    var email = req.body.email;
    var parola = req.body.pass;
    if(!email) {
        res.render('login',{error:"Please insert an email address"});
    }
    else {
        if(!parola) {
            res.render('login',{error:"Please insert the password"});
        }
        else {
            connection.query('SELECT COUNT(*) AS nr FROM user WHERE email = ?', email, (error,rows) => {
                if(error){
                    console.log(error);
                    res.render('login',{error:"Login failed, please try again"});
                }
                if(!error) {
                    if(rows[0].nr == 0) {
                        res.render('login',{error:"There is no account associated with this email"});
                    }
                    else {
                        connection.query("SELECT * FROM user WHERE email = ?", email, (error,userdata) => {
                            if(error) {
                                console.log(error);
                                res.render('login',{error:"Login failed, please try again"});                            }
                            if(!error) {
                                bcrypt.compare(parola, userdata[0].parola, function(err, rez) {
                                    if(!rez) {
                                        res.render('login',{error:"Wrong password"});
                                    }
                                    else {
                                        if(userdata[0].activated == 0) {
                                            res.render('login',{error:"Waiting for admin approval for using this account"});
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

app.get('/home', function(req,res) {
    var userdata = req.session.user;
    if(userdata) {
        res.render('home',{userdata: userdata,error:null});
    }
    else{
        res.redirect("/login")
    }
});


app.get('/colleagues', function(req, res) {
    if(req.session.user) {
        var idd = req.session.user.dep_id;
        if(req.session.user.cod_rol == 2) {
            connection.query("SELECT * FROM user",
            (error,data) => {
                if(error) {
                    console.log(error);
                    res.redirect('/colleagues');
                }
                if(!error) {
                    res.render('colleagues',{data:data,user:req.session.user,error:null});
                }
            });
        }
        else {
            connection.query("SELECT * FROM user WHERE dep_id = ? AND activated = ?",
            [idd,1],
            (error,data) => {
                if(error) {
                    console.log(error);
                    res.redirect('/colleagues');
                }
                if(!error) {
                    res.render('colleagues',{data:data,user:req.session.user,error:null});
                }
            });
        }
    }
})

app.post('/colleagues', function(req, res) {
    if(req.session.user) {
        var id = req.body.ID;
        if(id) {
            connection.query("SELECT * FROM user WHERE user_id = ?",
            id,
            (error,data) => {
                if(error) {
                    console.log(error);
                    res.redirect('/colleagues');
                }
                if(!error) {
                    req.session.colleague = data[0];
                    res.redirect('/profile');
                }
            });
        }
        else {
            var fname = req.body.fname;
            var lname = req.body.lname;
            var dep;
            if(req.session.user.cod_rol == 2) {
                dep = req.body.department;
                if(dep) {
                    var idd;
                    connection.query("SELECT * FROM departament WHERE nume = ?",
                    dep, 
                    (error,data) => {
                        if(!error) {
                            idd = data[0].dep_id;
                            if(!fname && lname) {
                                connection.query("SELECT * FROM user WHERE nume = ? AND dep_id = ?",
                                [lname,idd],
                                (error,data) => {
                                    if(!error) {
                                        res.render('colleagues',{data:data,user:req.session.user,error:null});
                                    }
                                    else {
                                        console.log(error);
                                        res.render('colleagues',{data:data,user:req.session.user,error:"An error occured while filtering the data, please try again"});  
                                    }
                                })
                            }
                            else {
                                if(!lname && fname) {
                                    connection.query("SELECT * FROM user WHERE prenume = ? AND dep_id = ?",
                                    [fname,idd], 
                                    (error,data) => {
                                        if(!error) {
                                            res.render('colleagues',{data:data,user:req.session.user,error:null});
                                        }
                                        else {
                                            console.log(error);
                                            res.render('colleagues',{data:data,user:req.session.user,error:"An error occured while filtering the data, please try again"});  
                                        }
                                    })
                                }
                                else{
                                    if(fname && lname) {
                                        connection.query("SELECT * FROM user WHERE prenume = ? AND nume = ? AND dep_id = ?",
                                        [fname,lname,idd], 
                                        (error,data) => {
                                            if(!error) {
                                                res.render('colleagues',{data:data,user:req.session.user,error:null});
                                            }
                                            else {
                                                console.log(error);
                                                res.redirect('/colleagues');
                                            }
                                        })
                                    }
                                    else {
                                        connection.query("SELECT * FROM user WHERE dep_id = ?",
                                        idd, 
                                        (error,data) => {
                                            if(!error) {
                                                res.render('colleagues',{data:data,user:req.session.user,error:null});
                                            }
                                            else {
                                                console.log(error);
                                                res.redirect('/colleagues');
                                            }
                                        })
                                    }
                                    
                                }
                            }
                        }
                        else {
                            console.log(error);
                            res.redirect('/colleagues');
                        }
                    })
        
                }
                else {
                    if(!fname && lname) {
                        connection.query("SELECT * FROM user WHERE nume = ?",
                        lname,
                        (error,data) => {
                            if(!error) {
                                res.render('colleagues',{data:data,user:req.session.user,error:null});
                            }
                            else {
                                console.log(error);
                                res.render('colleagues',{data:data,user:req.session.user,error:"An error occured while filtering the data, please try again"});  
                            }
                        })
                    }
                    else {
                        if(!lname && fname) {
                            connection.query("SELECT * FROM user WHERE prenume = ?",
                            fname, 
                            (error,data) => {
                                if(!error) {
                                    res.render('colleagues',{data:data,user:req.session.user,error:null});
                                }
                                else {
                                    console.log(error);
                                    res.render('colleagues',{data:data,user:req.session.user,error:"An error occured while filtering the data, please try again"});  
                                }
                            })
                        }
                        else{
                            if(fname && lname) {
                                connection.query("SELECT * FROM user WHERE prenume = ? AND nume = ?",
                                [fname,lname], 
                                (error,data) => {
                                    if(!error) {
                                        res.render('colleagues',{data:data,user:req.session.user,error:null});
                                    }
                                    else {
                                        console.log(error);
                                        res.redirect('/colleagues');
                                    }
                                })
                            }
                            else {
                                connection.query("SELECT * FROM user",
                                (error,data) => {
                                    if(!error) {
                                        res.render('colleagues',{data:data,user:req.session.user,error:null});
                                    }
                                    else {
                                        console.log(error);
                                        res.redirect('/colleagues');
                                    }
                                })
                            }
                        }
                    }
                }
            }
            else {
                if(!fname && lname) {
                    connection.query("SELECT * FROM user WHERE nume = ? AND dep_id = ?",
                    [lname, req.session.user.dep_id],
                    (error,data) => {
                        if(!error) {
                            res.render('colleagues',{data:data,user:req.session.user,error:null});
                        }
                        else {
                            console.log(error);
                            res.redirect('/colleagues');
                        }
                    })
                }
                else {
                    if(!lname && fname) {
                        connection.query("SELECT * FROM user WHERE prenume = ? AND dep_id = ?",
                        [fname, req.session.user.dep_id],
                        (error,data) => {
                            if(!error) {
                                res.render('colleagues',{data:data,user:req.session.user,error:null});
                            }
                            else {
                                console.log(error);
                                res.redirect('/colleagues');
                            }
                        })
                    }
                    else{
                        if(fname && lname) {
                            connection.query("SELECT * FROM user WHERE prenume = ? AND nume = ? AND dep_id = ?",
                            [fname,lname,req.session.user.dep_id], 
                            (error,data) => {
                                if(!error) {
                                    res.render('colleagues',{data:data,user:req.session.user,error:null});
                                }
                                else {
                                    console.log(error);
                                    res.redirect('/colleagues');
                                }
                            })
                        }
                        else {
                            connection.query("SELECT * FROM user WHERE dep_id = ?",
                            req.session.user.dep_id, 
                            (error,data) => {
                                if(!error) {
                                    res.render('colleagues',{data:data,user:req.session.user,error:null});
                                }
                                else {
                                    console.log(error);
                                    res.redirect('/colleagues');
                                }
                            })
                        }
                    }
                }
            }
        }
             
    }

})

app.get('/profile', function(req,res) {
    if((user = req.session.user)) {
        if((colleague = req.session.colleague)) {
            connection.query("SELECT * FROM departament WHERE dep_id = ?",
            colleague.dep_id,
            (error,data) => {
                if(error) {
                    console.log(error);
                    res.redirect('/profile');
                }
                if(!error) {
                    var id = req.session.colleague.user_id;
                    var dep = data[0];
                    connection.query("SELECT SUM(timp) AS ore FROM task WHERE id_user_f = ? OR id_user_s = ? OR id_user_t = ?",
                    [id,id,id],
                    (error,data) => {
                        if(error) {
                            console.log(error);
                            res.redirect('/profile');
                        }
                        if(!error) {
                            var ore = data[0].ore;
                            connection.query("SELECT denumire FROM task WHERE id_user_f = ? OR id_user_s = ? OR id_user_t = ?",
                            [id,id,id],
                            (error,data) => {
                                if(error) {
                                    console.log(error);
                                    res.render('profile',{colleague:colleague, user:user, dep:dep.nume, ore:'-', tasks:tasks,error:"An error occured while retrieving the data. Please try again later."});
                                }
                                if(!error) {
                                    var i = 1;
                                    var tasks = "";
                                    if(data[0]) {
                                        tasks = data[0].denumire;
                                    }
                                    while(data[i]!=null){
                                        tasks=tasks + ", " + data[i].denumire;
                                        i=i+1;
                                    }
                                    res.render('profile',{colleague:colleague, user:user, dep:dep.nume, ore:ore, tasks:tasks,error:null});
                                }
                            });
                        }
                    });
                }
            });
        }
        else {
            connection.query("SELECT * FROM departament WHERE dep_id = ?",
            user.dep_id,
            (error,data) => {
                if(error) {
                    console.log(error);
                    res.redirect('/profile');
                }
                if(!error) {
                    dep=data[0]
                    var id = req.session.user.user_id;
                    connection.query("SELECT COUNT(timp) AS ore FROM task WHERE id_user_f = ? OR id_user_s = ? OR id_user_t = ?",
                    [id,id,id],
                    (error,data) => {
                        if(error) {
                            console.log(error);
                            res.render('profile',{colleague:user, user:user, dep:dep.nume, ore:'-', error:"An error occured while retrieving the hours. Please try again later"});
                        }
                        if(!error) {
                            res.render('profile',{colleague:user, user:user, dep:dep.nume, ore:data[0].ore,error:null});
                        }
                    });
                }
            });
        }
    }
    else {
        res.redirect('/login');
    }
})


app.get('/availabletasks', function(req, res) {
    if(req.session.user) {
        var id = req.session.user.dep_id;
        if(req.session.user.cod_rol == 2) {
            connection.query("SELECT * FROM task WHERE NOT status = ?",
            'done',
            (error,data) => {
                if(error) {
                    console.log(error);
                    res.redirect('/availabletasks');
                }
                if(!error) {
                    res.render('availabletasks',{data:data,error:null});
                }
            });
        }
        else {
            connection.query("SELECT * FROM task WHERE id_dep = ? AND NOT status = ?",
            [id,'done'],
            (error,data) => {
                if(error) {
                    console.log(error);
                    res.redirect('/availabletasks');
                }
                if(!error) {
                    res.render('availabletasks',{data:data,error:null});
                }
            });
        }
    }
})

app.post('/availabletasks', function(req, res) {
    if(req.session.user) {
        var id = req.body.ID;
        connection.query("SELECT * FROM task WHERE task_id = ?",
        id,
        (error,data) => {
            if(error) {
                console.log(error);
                res.render('availabletasks',{data:data,error:"An error occured while retrieving the data, please try again later"});
            }
            if(!error) {
                req.session.task = data[0];
                res.redirect('/task');
            }
        });
    }
})

app.get('/task', function(req, res) {
    if(req.session.task) {
        var user = req.session.user;
        var task = req.session.task;
        res.render('task',{user:user, task:task,error:null});
    }
    else {
        res.redirect('/availabletasks');
    }
})

app.get('/mytasks', function(req, res) {
    if(req.session.user) {
        var id = req.session.user.user_id;
        connection.query("SELECT * FROM task WHERE id_user_f = ? OR id_user_s = ? OR id_user_t = ?",
        [id,id,id],
        (error,data) => {
            if(error) {
                console.log(error);
                res.redirect('/mytasks');
            }
            if(!error) {
                res.render('mytasks',{data:data,error:null});
            }
        });
    }
})

app.post('/mytasks', function(req, res) {
    if(req.session.user) {
        var id = req.body.ID;
        connection.query("SELECT * FROM task WHERE task_id = ?",
        id,
        (error,data) => {
            if(error) {
                console.log(error);
                res.render('mytasks',{data:data,error:"An error occured while retrieving the data, please try again later"});
            }
            if(!error) {
                req.session.task = data[0];
                res.redirect('/task');
            }
        });
    }
})

app.get('/addtask', function(req, res) {
    if(req.session.user.cod_rol) {
        res.render('addtask',{user:req.session.user,error:null});
    }
})

app.post('/addtask', function (req, res) {  
    var name = req.body.name;
    var description = req.body.description;
    var time = req.body.time;
    var nrofpersons = req.body.nrofpersons;
    var attach = req.body.file;
    var department;
    if(req.session.user.cod_rol==2) {
        department = req.body.department;
    }
    const name_pattern = /^(([A-Za-z])+.+.+)$/;
    if(!name_pattern.test(name)) {
        res.render('addtask',{user:req.session.user,error:"The name must start with a letter, and have at least 3 characters"});
    }
    else {
        if(!time) {
            res.render('addtask',{user:req.session.user,error:"Introduce estimated time"});
        }
        else {
            if(req.session.user.cod_rol == 2 && !department) {
                res.render('addtask',{user:req.session.user,error:"Please select a department"});
            }
            else {
                if(req.session.user.cod_rol == 2) {
                    var idd;
                    connection.query("SELECT * FROM departament WHERE nume = ?",
                    department, 
                    (error,rows) => {
                        if(!error) {
                            idd = rows[0].dep_id;
                            connection.query("INSERT INTO task (denumire, descriere, timp, nr_persoane, id_dep, attach,status) VALUES (?,?,?,?,?,?,?)",
                            [name,description,time,nrofpersons,idd,attach,'unstarted'], (error) => {
                                if(!error) {
                                    res.render('addtask',{user:req.session.user,error:"Data submitted successfully."});
                                }
                                else {
                                    console.log(error);
                                    res.render('addtask',{user:req.session.user,error:"An error occured while submitting the data, please try again"});
                                }
                            })
                        }
                        else{
                            console.log(error);
                            res.render('addtask',{user:req.session.user,error:"An error occured while submitting the data, please try again"});
                        }
                    })
                }
                else {
                    var idd = req.session.user.dep_id;
                    connection.query("INSERT INTO task (denumire, descriere, timp, nr_persoane, id_dep, attach,status) VALUES (?,?,?,?,?,?,?)",
                    [name,description,time,nrofpersons,idd,attach,'unstarted'], (error) => {
                        if(!error) {
                            res.render('addtask',{user:req.session.user,error:"Data submitted successfully."});
                        }
                        else {
                            console.log(error);
                            res.render('addtask',{user:req.session.user,error:"An error occured while submitting the data, please try again"});
                        }
                        
                    })
                }
            }
        }
    }
 })  

app.get('/deletetask', function (req,res) {
    if(req.session.task) {
        var id = req.session.task.task_id;
        connection.query("DELETE FROM task WHERE task_id = ?",
        id,
        (error) => {
            if(error) {
                console.log(error);
                res.redirect('/mytasks');
            }
            if(!error) {
                res.redirect('/mytasks');
            }
        });
    }
})

app.get('/droptask', function (req,res) {
    if(req.session.task) {
        if(req.session.user) {
            var id = req.session.task.task_id;
            if(req.session.user.user_id == req.session.task.id_user_f) {
                connection.query("UPDATE task SET id_user_f = NULL WHERE task_id = ?",
                id,
                (error) => {
                    if(error) {
                        console.log(error);
                        res.redirect('/droptask');
                    }
                    if(!error) {
                        res.redirect('/mytasks');
                    }
                });
            }
            else {
                if(req.session.user.user_id == req.session.task.id_user_s) {
                    connection.query("UPDATE task SET id_user_s = NULL WHERE task_id = ?",
                    id,
                    (error) => {
                        if(error) {
                            console.log(error);
                            res.redirect('/mytasks');
                        }
                        if(!error) {
                            res.redirect('/mytasks');
                        }
                    });
                }
                else {
                    connection.query("UPDATE task SET id_user_t = NULL WHERE task_id = ?",
                    id,
                    (error) => {
                        if(error) {
                            console.log(error);
                            res.redirect('/mytasks');
                        }
                        if(!error) {
                            res.redirect('/mytasks');
                        }
                    });
                }
            }
        }
    }
})

app.get('/maketask', function (req,res) {
    if(req.session.task) {
        if(req.session.user) {
            var id = req.session.task.task_id;
            var idu = req.session.user.user_id;
            if(!req.session.user.user_id_f) {
                connection.query("UPDATE task SET id_user_f = ? WHERE task_id = ?",
                [idu, id],
                (error) => {
                    if(error) {
                        console.log(error);
                        res.redirect('/mytasks');
                    }
                    if(!error) {
                        res.redirect('/mytasks');
                    }
                });
            }
            else {
                if(!req.session.task.id_user_s) {
                    connection.query("UPDATE task SET id_user_s = ? WHERE task_id = ?",
                    [idu, id],
                    (error) => {
                        if(error) {
                            console.log(error);
                            res.redirect('/mytasks');
                        }
                        if(!error) {
                            res.redirect('/mytasks');
                        }
                    });
                }
                else {
                    connection.query("UPDATE task SET id_user_t = ? WHERE task_id = ?",
                    [idu, id],
                    (error) => {
                        if(error) {
                            console.log(error);
                            res.redirect('/mytasks');
                        }
                        if(!error) {
                            res.redirect('/mytasks');
                        }
                    });
                }
            }
        }
    }
})

app.get('/markinprogress', function (req,res) {
    if(req.session.task) {
        var id = req.session.task.task_id;
        connection.query("UPDATE task SET status = 'inprogress' WHERE task_id = ?",
        id,
        (error) => {
            if(error) {
                console.log(error);
                res.redirect('/mytasks');
            }
            if(!error) {
                res.redirect('/mytasks');
            }
        });
    }
})

app.get('/markdone', function (req,res) {
    if(req.session.task) {
        var id = req.session.task.task_id;
        connection.query("UPDATE task SET status = 'done' WHERE task_id = ?",
        id,
        (error) => {
            if(error) {
                console.log(error);
                res.redirect('/mytasks');
            }
            if(!error) {
                res.redirect('/mytasks');
            }
        });
    }
})

app.get('/deleteaccount', function (req,res) {
    if(req.session.colleague) {
        var id = req.session.colleague.user_id;
        connection.query("DELETE FROM user WHERE user_id = ?",
        id,
        (error) => {
            if(error) {
                console.log(error);
                res.redirect('/colleagues');
            }
            if(!error) {
                res.redirect('/colleagues');
            }
        });
    }
})

app.get('/activateaccount', function (req,res) {
    if(req.session.colleague) {
        var id = req.session.colleague.user_id;
        connection.query("UPDATE user SET activated = ? WHERE user_id = ?",
        [1,id],
        (error) => {
            if(error) {
                console.log(error);
                res.redirect('/colleagues');
            }
            if(!error) {
                res.redirect('/colleagues');
            }
        });
    }
})

app.get('/changepassword', function(req,res) {
    if(req.session.user) {
        res.render('changepassword',{error:null});
    }
})

app.post('/changepassword', function(req,res) {
    if(req.session.user) {
        var new1 = req.body.new1;
        var new2 = req.body.new2;
        if(req.session.user.cod_rol == 0){
            var old = req.body.old;
            connection.query("SELECT * FROM user WHERE user_id = ?",
            req.session.user.user_id, 
            (error,rows) => {
                if(error) {
                    console.log(error);
                    res.render('changepassword', {user:req.session.user,error:"An error occured while submitting the data, please try again"});
                }
                if(!error) {
                    bcrypt.compare(old, rows[0].parola, function(err, rez) {
                        if(!rez) {
                            res.render('changepassword',{user:req.session.user,error:"Wrong password"});
                        }
                    });
                }
            })
        }
        const pass_pattern = /^.+.+.+.+.+.+.+.+$/;
        if(!pass_pattern.test(new1)) {
            res.render('changepassword',{user:req.session.user,error:"The password should contain at least 8 characters"});
        }
        else {
            if(new1 != new2) {
                res.render('changepassword',{user:req.session.user,error:"The fields do not match"});
            }
            else {
                bcrypt.hash(new1, saltRounds, (error, hash) => {
                    connection.query("UPDATE user SET parola = ? WHERE user_id = ?", [hash,req.session.colleague.user_id], 
                    (error) => {
                        if(!error) {
                            res.redirect('/profile')
                        }
                        else {
                            console.log(error);
                            res.render('changepassword',{user:req.session.user,error:"An error occured while submitting the data, please try again"});  
                        }
                    })
                })
            }
        }
    }
})

app.get('/edittask',function(req,res) {
    if(req.session.task) {
        res.render('edittask',{task:req.session.task,error:null})
    }
})

app.post('/edittask', function (req, res) {  
    var name = req.body.name;
    var description = req.body.description;
    var time = req.body.time;
    var nrofpersons = req.session.task.nr_persoane;
    var attach = req.body.file;
    var f_id = req.body.f_id;
    var status = req.body.status;
    var s_id;
    var t_id;
    if(nrofpersons >= 2) {
        s_id = req.body.s_id;
        if(nrofpersons == 3) {
            t_id = req.body.t_id;
        }
    }
    const name_pattern = /^(([A-Za-z])+.+.+)$/;
    if(!name_pattern.test(name)) {
        res.render('edittask',{task:req.session.task,error:"The name must start with a letter, and have at least 3 characters"});
    }
    else {
        if(!time) {
            res.render('edittask',{task:req.session.task,error:"Introduce estimated time"});
        }
        else {
            if(!status) {
                res.render('edittask',{task:req.session.task,error:"Status is required"});
            }
            else {
                connection.query("UPDATE task SET denumire = ?, descriere = ?, timp = ?, attach = ?, id_user_f = ?, id_user_s = ?, id_user_t = ?, status = ? WHERE task_id = ?",
                [name,description,time,attach, f_id, s_id, t_id, status, req.session.task.task_id], (error,rows) => {
                    if(!error) {
                        res.redirect('/task');
                    }
                    else {
                        console.log(error);
                        res.render('edittask',{task:req.session.task,error:"An error occured while submitting the data, please try again"});  
                    }
                    
                })
            }
        }
    }
 })  

 app.get('/alltasks',function(req,res) {
    if(req.session.user.cod_rol == 2) {
        connection.query("SELECT * FROM task",
        (error,data) => {
            if(error) {
                console.log(error);
                res.redirect('/alltasks');
            }
            if(!error) {
                res.render('mytasks',{data:data,error:null});
            }
        });
    }
    else {
        connection.query("SELECT * FROM task WHERE id_dep = ?", req.session.user.dep_id,
        (error,data) => {
            if(error) {
               res.redirect('/alltasks');
            }
            if(!error) {
                res.render('mytasks',{data:data,error:null});
            }
        });
    }
 })

app.get('/edituser',function(req,res) {
    if(req.session.colleague) {
        connection.query("SELECT * FROM departament WHERE dep_id = ?",
        colleague.dep_id,
        (error,data) => {
            if(error) {
                console.log(error);
                res.redirect('/profile');
            }
            if(!error) {
                res.render('edituser',{user:req.session.user, colleague:req.session.colleague, dep:data[0],error:null});
            }
        })
    }
})

app.post('/edituser', function (req, res) {  
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var email = req.body.email;
    var phone = req.body.nr_telefon;
    var cod, department, rol;
    if(req.session.user.cod_rol == 2) {
        department = req.body.department;
        rol = req.body.rol;
        if(rol == 'Volunteer') {
            cod = 0;
        }
        else {
            if(rol == 'Coordinator') {
                cod = 1;
            }
            else {
                cod = 2;
            }
        }
    }
    const name_pattern = /^((([A-Z])([a-z]+)( ([A-Z])([a-z]+))*)+)$/;
    if(!name_pattern.test(firstname)) {
        res.render('edituser',{user:req.session.user, colleague:req.session.colleague, dep:'',error:"The name must start with an uppercase, the following letters must be lowercase, the name must have at least 2 letters and cannot contain numbers or symbols"});
    }
    else {
        if(!name_pattern.test(lastname)) {
            res.render('edituser',{user:req.session.user, colleague:req.session.colleague, dep:'-',error:"The name must start with an uppercase, the following letters must be lowercase, the name must have at least 2 letters and cannot contain numbers or symbols"});
        }
        else {
            const email_pattern = /^[A-Za-z](.+)@([A-Za-z]+)\.([A-Za-z]+)$/;
            if(!email_pattern.test(email)) {
                res.render('edituser',{user:req.session.user, colleague:req.session.colleague, dep:'-',error:"Introduce a valid email address"});
            }
            else {
                const tel_pattern = /^07[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$/;
                if(!tel_pattern.test(phone)) {
                    res.render('edituser',{user:req.session.user, colleague:req.session.colleague, dep:'-',error:"Introduce a valid phone number (format:07xxxxxxxx)"});
                }
                else {
                    if(!rol && req.session.user.cod_rol == 2) {
                        res.render('edituser',{user:req.session.user, colleague:req.session.colleague, dep:'-',error:"Please select a role"});
                    }
                    else {

                        if(!department && req.session.user == 2) {
                            res.render('edituser',{user:req.session.user, colleague:req.session.colleague, dep:'-',error:"Please select a department"});
                        }
                        else {
                            connection.query('SELECT COUNT(*) AS nr FROM user WHERE email = ? AND NOT user_id = ?', [email, req.session.colleague.user_id], 
                            (error,rows) => {
                                if(error) {
                                    console.log(error);
                                    res.render('edituser',{user:req.session.user, colleague:req.session.colleague, dep:'-',error:"An error occured while submitting the data, please try again"});
                                }
                                if(!error) {
                                    if(rows[0].nr) {
                                        res.render('edituser',{user:req.session.user, colleague:req.session.colleague, dep:'-',error:"Another account with this email already exists"});
                                    }
                                    else {
                                        var id = 0;
                                        connection.query("SELECT * FROM departament WHERE nume = ?",
                                        department, 
                                        (error,rows) => {
                                            if(error) {
                                                console.log(error);
                                                res.render('edituser',{user:req.session.user, colleague:req.session.colleague, dep:'-',error:"An error occured while submitting the data, please try again"});
                                            }
                                            if(!error) {
                                                id = rows[0].dep_id;
                                                connection.query("UPDATE user SET email =?, nume = ?, prenume = ?, telefon = ?, dep_id = ?, cod_rol = ? WHERE user_id = ?",
                                                [email, lastname, firstname, phone, id, cod, req.session.colleague.user_id], 
                                                (error) => {
                                                    if(!error) {
                                                        res.redirect('/colleagues');
                                                    }
                                                    else {
                                                        console.log(error);
                                                        res.render('edituser',{user:req.session.user, colleague:req.session.colleague, dep:'-',error:"An error occured while submitting the data, please try again"});  
                                                    }
                                                })
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
 }) 

 app.post('/home',function(req,res) {
     req.session.user = null;
     res.redirect('/login');
 })

app.listen(port);
console.log('Server is listening on port ', port);