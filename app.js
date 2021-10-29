const express = require('express')
const app = express()
const mysql = require('mysql')

const port = process.env.PORT || 3000

const connection = mysql.createConnection({
    host: 'eu-cdbr-west-01.cleardb.com',
    user: 'b3a939da38a4c8',
    password: '59e208d0',
    database: 'heroku_2dbe65ac07f9310'
})

app.set('view engine', 'ejs')


app.use(express.static(__dirname + '/resources'));

app.get('/', function(req, res) {
    /*connection.query('SELECT * FROM departament WHERE dep_id = "5"', (error,rows) => {
        if(error) throw error;
    
        if(!error) {
            console.log(rows)
        }
    })*/
    res.render('register')
})

app.get('/login', function(req, res) {
    /*connection.query('SELECT * FROM departament WHERE dep_id = "5"', (error,rows) => {
        if(error) throw error;
    
        if(!error) {
            console.log(rows)
        }
    })*/
    res.render('login')
})

app.get('/home', function(req, res) {
    /*connection.query('SELECT * FROM departament WHERE dep_id = "5"', (error,rows) => {
        if(error) throw error;
    
        if(!error) {
            console.log(rows)
        }
    })*/
    res.render('home')
})

app.listen(port)
console.log('Server is listening on port ', port);
