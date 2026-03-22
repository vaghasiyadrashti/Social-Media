require('dotenv').config();
const connectDB = require('./db/index');
const app = require('./app');

connectDB()
.then(()=>app.listen(process.env.PORT||3000, () => console.log(`Server is running on port ${process.env.PORT}`)))
.catch(err=>console.log(`MongoDB connection failed!!`, err));
