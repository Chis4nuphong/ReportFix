const express = require('express')
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');


const app = express()
const port = 3000


// ใช้ให้เปิดดู ejs ได้
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// เชื่อม sql
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'member'
  });
  
  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL database: ' + err.stack);
      return;
    }
    console.log('Connected to MySQL database');
  });

  // แสดงหน้าลงทะเบียน/เข้าสู่ระบบ
app.get('/login', (req, res) => {
    res.render('login');
  });
  
  app.get('/register', (req, res) => {
    res.render('register');
  });
  
  // การลงทะเบียนผู้ใช้ใหม่
  app.post('/register', async (req, res) => {
    const { registerUsername, registerEmail, registerPassword } = req.body;
  
    try {
      // ทำการเข้ารหัสรหัสผ่าน
      const hashedPassword = await bcrypt.hash(registerPassword, 10);
      
  
      // ตรวจสอบว่าชื่อผู้ใช้ซ้ำหรือไม่
      const checkUsernameQuery = 'SELECT COUNT(*) as count FROM users WHERE username = ?';
      connection.query(checkUsernameQuery, [registerUsername], (checkErr, checkResults) => {
        if (checkErr) {
          console.error(checkErr);
          res.status(500).send('Internal Server Error');
          return;
        }
  
        const usernameCount = checkResults[0].count;
        if (usernameCount > 0) {
          // ชื่อผู้ใช้ซ้ำ
          return res.render('register', { registerError: 'Username is already taken' });
        }
  
        // บันทึกข้อมูลผู้ใช้ใหม่ลงในฐานข้อมูล
        const insertUserQuery = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        connection.query(insertUserQuery, [registerUsername, registerEmail, hashedPassword], (insertErr, insertResults) => {
          if (insertErr) {
            console.error(insertErr);
            res.status(500).send('Internal Server Error');
            return;
          }
  
          console.log('User registered successfully');
          res.redirect('/login'); // ลงทะเบียนเสร็จสิ้น ให้เปลี่ยนเส้นทางไปยังหน้า Login/Register
        });
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  // เข้าสู่ระบบ
  app.post('/login', async (req, res) => {
    const { loginUsername, loginPassword } = req.body;
  
    try {
      // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
      connection.query('SELECT * FROM users WHERE username = ?', [loginUsername], async (err, results) => {
        if (err) throw err;
  
        if (results.length === 0) {
          // ไม่พบผู้ใช้
          return res.render('login', { loginError: 'Invalid username or password' });
        }
  
        const user = results[0];
  
        const passwordMatch = await bcrypt.compare(loginPassword, user.password);
      if (!passwordMatch) {
        // รหัสผ่านไม่ถูกต้อง
        return res.render('login', { loginError: 'Invalid username or password' });
      }
  
        // เข้าสู่ระบบสำเร็จ
        console.log('User logged in successfully');
        req.session.user = { id: user.id, username: user.username };
        res.redirect('/home');  // เข้าสู่ระบบเสร็จสิ้น ให้เปลี่ยนเส้นทางไปยังหน้า home
      });
      
      const authenticateUser = (req, res, next) => {
        const user = req.session.user;
        if (!user) {
          return res.redirect('/login');
        }
        next();
      };
      
      // เรียกใช้หน้า home บนเว็บ
      app.get('/home', authenticateUser, (req, res) => {
        const user = req.session.user;
      
        // ทำสิ่งที่คุณต้องการทำหลังจากเข้าสู่ระบบสำเร็จ, เช่น แสดงหน้า dashboard
        res.render('home', { user });
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

// เรียกใช้หน้าหลักบนเว็บ
    app.get('/', (req, res) => {
        res.render('login')
    })

// เรียกใช้หน้าร้องขอซ่อมบนเว็บ
app.get('/repe',(req, res) => {
    res.render('repe');
});

// เพิ่มข้อมูลการซ่อม หน้าปกติ
app.post('/submit', (req, res) => {
    let { reporterName, problemDescription, jobDetails, location } = req.body;
    let sql = `INSERT INTO repairs (reporterName, problemDescription, jobDetails, location) 
        VALUES ('${reporterName}', '${problemDescription}', '${jobDetails}', '${location}')`;
    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error while inserting data: ' + err.message);
            res.status(500).send('Error while inserting data');
            return;
        }
        console.log(result); 
        res.status(200).send(`
            <div style=" text-align: center;">  
                <p style="color: color: rgb(200, 200, 200);">ข้อมูลถูกเพิ่มลงในตารางการซ่อมแล้ว</p>
                <button onclick="window.location.href='/repe'" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">กลับ</button>
            </div>
        `);
    });
});


// หน้าแสดงข้อมูลการซ่อมบนเว็บ
app.get('/datarepe', (req, res) => {
    let sql = "SELECT * FROM repairs";
    connection.query(sql, (err, repairs) => {
        if (err) {
            console.error('Error while fetching repairs: ' + err.message);
            res.status(500).send('Error while fetching repairs');
            return;
        }
        res.render('datarepe', { repairs: repairs });
    });
});

// ลบข้อมูลในฐานข้อมูล หน้าเว็บ
app.post('/delete/:id', (req, res) => {
    const id = req.params.id;
    let sql = `DELETE FROM repairs WHERE id = ${id}`;
    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error while deleting repair: ' + err.message);
            res.status(500).send('Error while deleting repair');
            return;
        }
        console.log(result);
        res.redirect('/datarepe');
    });
});






app.listen(port, () => {
    console.log(`app listening at port ${port}`)
})

// Define authenticateUser middleware function
const authenticateUser = (req, res, next) => {
    const user = req.session.user;
    if (!user) {
        return res.redirect('/login');
    }
    next();
};

// Route handler for '/home'
app.get('/home', authenticateUser, (req, res) => {
    const user = req.session.user;
    // Render the home page with user data
    res.render('home', { user });
});



