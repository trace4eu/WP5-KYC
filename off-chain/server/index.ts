// check https://blog.logrocket.com/how-to-set-up-node-typescript-express/

import express,  { Express, Request, Response } from 'express';
import dotenv from "dotenv";
import cors from 'cors';
import multer from 'multer'
import contentDisposition from 'content-disposition'
import fs from 'fs'
import bodyParser from 'body-parser'
import https from 'https'


dotenv.config();
// create an express app
const app: Express = express();
const port = process.env.PORT || 3000;

const isHttps = process.env.SETHTTPS || false;

let key;
let cert;
let options;

if (isHttps) {

   key = fs.readFileSync('/certs/cert.key');
   cert = fs.readFileSync('/certs/cert.crt');

   options = {
      key: key,
      cert: cert
    };
}

async function verifyvp(vptoken:string):Promise<boolean> {
  if (vptoken == 'vptoken') return true;
  return false;
}

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      return cb(null, "./KYCdocs")
    },
    filename: function (req, file, cb) {
      return cb(null, `${Date.now()}_${file.originalname}`)
    },
    
  })
  
  const upload = multer({
    storage,
    async fileFilter(req, file, cb) {

      //not called if file does not exists
      //vp_token must be first in request
      console.log('req body in filter->'+req.body.vp_token);

    
      if(!req.body || !req.body.vp_token){
        return cb(new Error('token missing'))
      }

         //verify vp_token
       const verified = await verifyvp(req.body.vp_token );
       if (!verified) {
          return cb(new Error('invalid token'))
       }
 
        return cb(null, true) 
    
    },
  }).single('file');

// enable cors for all HTTP verbs and origins 
app.use(cors())
app.use(bodyParser.json())
//app.use(formidable())

// create a default endpoint that returns a file uploads response
app.get('/', (req: Request, res: Response) => {
     res.json({ message: 'welcome to file upload'});
})

app.post('/upload', (req, res) => {


      upload(req, res, async function (err) {

        console.log('err->'+err);
   
       //does not give err if file is not specified
       if (err instanceof multer.MulterError) {
        return res.status(500).json(err)
       } else if (err && err.message) {
        return res.status(400).send(err.message)
       } else if (err) {
         return res.status(400).send(err)
       }
       
        if (!req.file ) {
          return  res.status(400).send('need to specify the file name');
        }

      
        
      
        console.log("file uploaded. fileInfo: " + JSON.stringify(req.file));
        //file uploaded
        //find did from vp_token and save with file path
        console.log('vp_token->'+req.body.vp_token);
        return res.status(200).send(req.file)
      });
  })

//   app.get('/download1', (req: Request, res) => {

    
//     if (!req.query.file) {
//         res.status(400).send({error: "file parameter is missing"}); 
//         return;
//     }

//     console.log('file to download->'+req.query.file);

//     res.setHeader('Content-Type', 'application/octet-stream')

//     try {
//    // res.setHeader('Content-Disposition', contentDisposition(req.body.file))
//       let dataToSent: string;
//         if (!fs.existsSync(req.query.file.toString())) {
//             res.setHeader('Content-Type', 'application/json')
//             res.status(400).send({error: "file does not exists"});  
//             console.log('file not found');
//         } else {
//         let stream = fs.createReadStream(req.query.file.toString())
//         let size=0;
//         stream.on('error', function(err) {
//             res.status(500).send({error: "error reading requested file-"+err});
//           });
//         stream.on('data', function(chunk) {
//           size=size+chunk.length;
//           dataToSent = dataToSent+chunk;
//        // res.write(chunk);
          
//         // console.log('sent->'+size);
//         })
//         stream.on('finish', function() {
//             console.log('finish sent->'+size);
            
//           //  res.end();
//            // stream.destroy();
//         })
//         stream.on('end', function() {
//             console.log('end sent->'+size);
//          //   res.status(200).send(dataToSent);
//           //  res.end();
//            // stream.destroy();
//         })
//        stream.pipe(res)
//     //  res.status(200).send()
//     }
    

//      } catch(err) {
//         console.log('err');
//         res.status(500).json(err)
//      }

// })

app.get('/download', (req: Request, res) => {

    
    if (!req.query.file) {
        res.status(400).send({error: "file parameter is missing"}); 
        return;
    }

    console.log('file to download->'+req.query.file);

    res.setHeader('Content-Type', 'application/octet-stream')

    try {
   // res.setHeader('Content-Disposition', contentDisposition(req.body.file))
  
        if (!fs.existsSync(req.query.file.toString())) {
            res.setHeader('Content-Type', 'application/json')
            res.status(400).send({error: "file does not exists"});  
            console.log('file not found');
        } else {
           const data = fs.readFileSync(req.query.file.toString())
           console.log('data to send->'+data.length);
          res.status(200).send(data);
    }
    

     } catch(err) {
        console.log('err');
        res.status(500).json(err)
     }

})

app.delete('/delete', (req: Request, res) => {

    
 
  if (!req.body.file) {
    res.status(400).send("file parameter is missing"); 
    return;
  }

  
  if (!req.body.vp_token) {
    res.status(400).send("vp token is missing"); 
    return;
  }

  console.log('file to delete->'+req.body.file);

  res.setHeader('Content-Type', 'application/json')

  //validate vp_token and check if did is associated with requested file to delete

  try {
 // res.setHeader('Content-Disposition', contentDisposition(req.body.file))

      if (!fs.existsSync(req.body.file.toString())) {
        
          res.status(400).send("file does not exists");  
          console.log('file not found');
      } else {
         fs.unlink(req.body.file.toString(), (err)=>{
          if (err) {
            console.error(err);
            res.status(400).send(err);  
          }
          else console.log('file deleted');
          res.status(200).send();
         })
     
        
      }
  

   } catch(err) {
      console.log('err');
      res.status(500).json(err)
   }

})

// a catch-all middleware for unknown endpoints
app.use('*', (req: Request, res: Response) => {
     res.status(404).json({ message: 'api not found'})
})

if (isHttps) {

  const key = fs.readFileSync('/certs/cert.key');
  const cert = fs.readFileSync('/certs/cert.crt');

  const options = {
       key: key,
       cert: cert
     };

  https.createServer(options, app).listen(port, ()=> 
    console.log(`[server]: Server is running at https://localhost:${port}`)
  )
  
} else {

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  })
}