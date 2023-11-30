const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config();
const jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser')
const stripe = require("stripe")(`${process.env.STRIPE_SECRET_KEY}`);

app.use(express.static("public"));
app.use(express.json());

const port = process.env.PORT || 5000

app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://last-assignment-d82ca.web.app'],
  credentials: true,
}))
app.use(cookieParser())

const { MongoClient, ServerApiVersion, ObjectId, Admin } = require('mongodb');
const uri = `mongodb+srv://${process.env.M_DB_USER}:${process.env.M_DB_PASS}@cluster0.dhtqvw7.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const availableCamps = client.db("camp").collection("availableCamp");
    const ParticipantCamps = client.db("camp").collection("participant");
    const UserCamps = client.db("camp").collection("users");
    const UserPayment = client.db("camp").collection("payment");
    const userRating = client.db("camp").collection("rating");

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_TOKEN, { expiresIn: '1h' });
      res.send({ token });
    })

    const verifyToken = (req, res, next) => {
      // console.log(req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      // console.log(token)
      jwt.verify(token, process.env.JWT_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    
    app.get('/availableCamps', async (req, res) => {
      let quer = {}
      if (req.query.category) {
        quer = { category: req.query.category }
      }
      const cursor = availableCamps.find(quer)
      const result = await cursor.toArray()
      res.send(result)
    })
    app.post('/rating', async (req, res) => {
      const data = req.body
      const result = await userRating.insertOne(data)
      res.send(result)
    })
    // Payment-=-=-=-=-==-=-=-
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await UserPayment.insertOne(payment);
      console.log('payment info', payment);
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      };
      const deleteResult = await ParticipantCamps.deleteMany(query);
      res.send({ paymentResult, deleteResult });
    })

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'aaaaaaaaaaaaaaaaaa')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

   
    app.get('/rating', async (req, res) => {
      const cursor = userRating.find()
      const result = await cursor.toArray()
      res.send(result)
    })
    app.get('/participantcamp', async (req, res) => {
      const cursor = ParticipantCamps.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.post('/addcamp', async (req, res) => {
      const document = {
        ...req.body,
        scheduledDateTime: new Date(),
      };
      const result = await availableCamps.insertOne(document)
      res.send(result)
    })

    
    app.get('/paymentstttt/:email', async (req, res) => {
      
      const query = { email: req.params.email }
      const result = await UserPayment.find(query).toArray();
      res.send(result);
    })


    app.post('/user', async (req, res) => {
      const data = req.body
      const query = { email: data.email }
      const existingUser = await UserCamps.findOne(query)
      if (existingUser) {
        return res.send({ messege: 'user already exists', insertedId: null })
      }
      const result = await UserCamps.insertOne(data)
      res.send(result)

    })

  

    app.get('/user/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        res.status(403).send({ message: 'unauthorized access' })
      }
      const query = { email: email }
      const user = await UserCamps.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin })

    })

    app.delete('/user/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await UserCamps.deleteOne(query)
      res.send(result)
    })
    app.get('/user', async (req, res) => {
      const cursor = UserCamps.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.patch('/user/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin',
        }
      }
      const result = await UserCamps.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.put('/ubdateCamp/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedProdect = req.body
      const updated = {
        $set: {
          campName: updatedProdect.campName,
          price: updatedProdect.price,
          image: updatedProdect.image,
          venueLocation: updatedProdect.venueLocation,
          specializedServices: updatedProdect.specializedServices,
          healthcare: updatedProdect.healthcare,
          targetAudience: updatedProdect.targetAudience,
          longDescription: updatedProdect.longDescription,
        }
      }
      const result = await availableCamps.updateOne(filter, updated, options);
      res.send(result)
    })

    app.get('/availableCamp/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await availableCamps.findOne(query)
      res.send(result)
    })
    app.post('/participant', async (req, res) => {
      const data = {
        ...req.body,
        scheduledDateTime: new Date(),
      };
      const result = await ParticipantCamps.insertOne(data)
      res.send(result)
    })

    app.get('/participant', async (req, res) => {
      let quer = {}
      if (req.query.email) {
        quer = { email: req.query.email }
      }
      const cursor = ParticipantCamps.find(quer)
      const result = await cursor.toArray()
      res.send(result)
    })
    app.get('/participant/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await ParticipantCamps.findOne(query)
      res.send(result)
    })


    
    app.patch('/camp-count/:id',async(req,res)=>{
      const id=req.params.id;
      console.log("oooppp",id)
      const existingCamp= await availableCamps.findOne({_id: new ObjectId(id)});
      const currentCount=existingCamp && existingCamp.count !== undefined ? existingCamp.count : 0;
      const query= {_id: new ObjectId(id)}
      const options={upsert: true};
      const updatedDoc={
        $set:{
          count: currentCount + 1
        }
      }
      const result =await availableCamps.updateOne(query,updatedDoc,options)
      res.send(result)
    })

    app.delete('/participant/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await ParticipantCamps.deleteOne(query)
      res.send(result)
    })

    app.delete('/deletecamp/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await availableCamps.deleteOne(query)
      res.send(result)
    })
   
  
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})