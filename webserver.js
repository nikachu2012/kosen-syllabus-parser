/*
    Simple Web Server
//*/
import express from 'express'
const app = express();

//env
const port = 3000

app.use(express.static('serve'));

app.listen(port, () => {
    console.log(`Start server port: ${port}`);
});