const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster23.yyril.mongodb.net/?retryWrites=true&w=majority&appName=Cluster23`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const shopCollection = client.db('shopDB').collection('shop')
    const userCollection = client.db('userDB').collection('users')
    const cartCollection = client.db('cartDB').collection('cart')

    app.get('/shop', async(req, res) => {
      const result = await shopCollection.find().toArray();
      res.send(result)
    })

    app.get('/cart', async(req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result)
    })

    app.post('/users', async(req, res) => {
      const user = req.body;
      // console.log(user);
      const query = {email: user.email}
      // console.log(query);
      const isExist = await userCollection.findOne(query)
      if(isExist){
        return res.send({
          message: "email is already exist",
          insertedId: null,
        });
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })

    app.post('/cart', async(req, res) => {
      const data = req.body;
      console.log(data);
      const result = await cartCollection.insertOne(data)
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(`shop is running`);
});

app.listen(port, (req, res) => {
  console.log(`shop is running on port: ${port}`);
});
