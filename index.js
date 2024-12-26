const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
const { default: axios } = require("axios");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster23.yyril.mongodb.net/?retryWrites=true&w=majority&appName=Cluster23`;

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

    const shopCollection = client.db("shopDB").collection("shop");
    const userCollection = client.db("userDB").collection("users");
    const cartCollection = client.db("cartDB").collection("cart");
    const checkoutCollection = client.db("checkoutDB").collection("checkout");
    const newArrivalCollection = client
      .db("newArrivalDB")
      .collection("newarrival");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const verifyToken = async (req, res, next) => {
      console.log(req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = await req.headers.authorization.split(" ")[1];
      await jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      // console.log(email, query);
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      // console.log(email, req.decoded.email);
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.get("/newarrival", async (req, res) => {
      const result = await newArrivalCollection.find().toArray();
      res.send(result);
    });

    app.post("/newarrival", async (req, res) => {
      const user = req.body;
      const result = await newArrivalCollection.insertOne(user);
      res.send(result);
    });

    app.patch("/newarrival/:id", async (req, res) => {
      const id = req.params.id;
      const item = req.body;
      const result = await newArrivalCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: item }
      );
      res.send(result);
    });

    app.post("/shop", async (req, res) => {
      const user = req.body;
      const result = await shopCollection.insertOne(user);
      res.send(result);
    });

    app.get("/shop", async (req, res) => {
      const result = await shopCollection.find().toArray();
      res.send(result);
    });

    app.get("/shop/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await shopCollection.findOne(query);
      res.send(result);
    });

    app.patch("/shop/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateItem = {
        $set: {
          title: item?.title,
          image: item?.image,
          price: item?.price,
          category: item?.category,
          description: item?.description,
          discount: item?.discount,
          stock: item?.stock,
        },
      };
      const result = await shopCollection.updateOne(filter, updateItem);
      res.send(result);
    });

    app.delete("/shop/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await shopCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      // console.log(query);
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const query = { email: user.email };
      // console.log(query);
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send({
          message: "email is already exist",
          insertedId: null,
        });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.post("/cart", async (req, res) => {
      const data = req.body;
      // console.log(data);
      const result = await cartCollection.insertOne(data);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedAdmin = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedAdmin);
      res.send(result);
    });

    app.post("/create-checkout", async (req, res) => {
      const { checkoutInfo } = await req.body;
      const transactionId = uuidv4();

      const initiateData = {
        store_id: "progr66ec55528663c",
        store_passwd: "progr66ec55528663c@ssl",
        total_amount: checkoutInfo.totalPrice,
        currency: "BDT",
        tran_id: transactionId,
        success_url: "http://localhost:5000/success-checkout",
        fail_url: "http://localhost:5000/failed-checkout",
        cancel_url: "http://localhost:5000/cancel-checkout",
        cus_name: checkoutInfo.name,
        cus_email: checkoutInfo.email,
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: checkoutInfo.phone,
        cus_fax: "01711111111",
        shipping_method: "NO",
        product_name: "Clothe",
        product_category: "clothes",
        product_profile: "general",
        multi_card_name: "mastercard,visacard,amexcard",
        value_a: "ref001_A",
        value_b: "ref002_B",
        value_c: "ref003_C",
        value_d: "ref004_D",
      };

      try {
        const response = await axios({
          method: "POST",
          url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
          data: initiateData,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        const resData = {
          trans_id: initiateData.tran_id,
          cus_name: initiateData.cus_name,
          cus_email: initiateData.cus_email,
          checkout_bill: initiateData.total_amount,
          cus_phone: initiateData.cus_phone,
          checkout_date: checkoutInfo.date,
          cus_address: checkoutInfo.address,
          status: "pending",
        };

        const result = await checkoutCollection.insertOne(resData);
        if (result) {
          res.send({
            paymentURL: response.data.GatewayPageURL,
          });
        }
      } catch (error) {
        console.error("Payment initiation failed:", error);
        res.status(500).send("Error initiating payment");
      }
    });

    app.post("/success-checkout", async (req, res) => {
      const successData = req.body;
      console.log(successData);
      if (successData.status !== "VALID") {
        throw new Error("failed payment or unauthorized payment");
      }
      const query = {
        trans_id: successData.tran_id,
      };
      const update = {
        $set: {
          status: "success",
        },
      };
      const result = await checkoutCollection.updateOne(query, update);
      const findEmail = await checkoutCollection.findOne(query)
      const email = findEmail?.cus_email;
      if(email){
        const queryEmail = {email: email}
        console.log(queryEmail);
        await cartCollection.deleteMany(queryEmail);
      }

      res.redirect("http://localhost:5173/dashboard/success");
    });

    app.post("/failed-checkout", async (req, res) => {
      const failedCheckout = req.body;
      if (failedCheckout.status === "FAILED") {
        res.redirect("http://localhost:5173/dashboard/failed");
      }
    });

    app.post("/cancel-checkout", async (req, res) => {
      const cancelCheckout = req.body;
      if (cancelCheckout.status === "CANCELLED") {
        res.redirect("http://localhost:5173/dashboard/cancel");
      }
    });

    app.get("/checkout-list", async (req, res) => {
      const query = { cus_email: req.query.email };
      // console.log(query);
      const result = await checkoutCollection.find(query).toArray();
      res.send(result);
    });

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
