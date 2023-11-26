const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
var cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000
app.use(express.json())
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}))
app.use(cookieParser())


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

    app.get('/availableCamps', async (req, res) => {
      let quer = {}
      if (req.query.category) {
        quer = { category: req.query.category }
      }
      const cursor = availableCamps.find(quer)
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/ParticipantCamp', async (req, res) => {
      let quer = {}
      if (req.query.category) {
        quer = { category: req.query.category }
      }
      const cursor = ParticipantCamps.find(quer)
      const result = await cursor.toArray()
      res.send(result)
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

    app.get('/availableCamp/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await availableCamps.findOne(query)
      res.send(result)
    })
    app.post('/participant', async (req, res) => {
      const data = req.body
      console.log(data)
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
    app.delete('/participant/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await ParticipantCamps.deleteOne(query)
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