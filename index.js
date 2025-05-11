require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
// const jwt = require("jsonwebtoken");
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: ["http://localhost:5173",],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hathz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

      const userCollection = client.db("assetDB").collection("users");
      const productCollection = client.db("assetDB").collection("products");
    const requestCollection = client.db("assetDB").collection("requestProducts");

    // user related apis-------------------------------------------

    app.get("/users", async (req, res) => {
      try {
        const result = await userCollection
          .find({ role: "employee", companyId: { $exists: false } })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });

    // navbar
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // joinEmployee | joinHR page
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne({
        ...user,
        timeStamp: Date.now(),
      });
      res.send(result);
    });

    // product related apis-----------------------------------------------------

    // AddAsset.jsx
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    // AssetList.jsx
    app.get("/products", async (req, res) => {
      const products = await productCollection.find().toArray();
      res.send(products);
    });

    app.get("/assets", async (req, res) => {
      try {
        const assets = await productCollection.find().toArray();
        res.status(200).json(assets);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch assets" });
      }
    });
    // MyAsset.jsx
    app.get("/products/:email", async (req, res) => {
      const email = req.params.email;
      const query = { employeeEmail: email };
      const products = await requestCollection.find(query).toArray();
      res.send(products);
    });

    // asset request collection -------------------------------------------------
    app.get("/allRequestAsset", async (req, res) => {
      const result = await requestCollection.find().toArray();
      res.send(result);
    });

    app.get("/requestAsset/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const assets = await requestCollection
          .aggregate([
            {
              $addFields: {
                employeeEmail: { $ifNull: ["$employeeEmail", "unknown"] },
              },
            },
            {
              $match: { employeeEmail: email },
            },
          ])
          .toArray();

        res.status(200).json(assets);
      } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
      }
    });



    // RequestAsset.jsx
    app.post("/requestProducts", async (req, res) => {
      try {
        const {
          assetId,
          assetName,
          assetType,
          requestDate,
          requestStatus,
          employeeName,
          employeeEmail,
          notes,
        } = req.body;

        const newRequest = {
          assetId,
          assetName,
          assetType,
          requestDate,
          requestStatus,
          employeeName,
          employeeEmail,
          notes,
        };

        const result = await requestCollection.insertOne(newRequest);
        res.status(201).json({ insertedId: result.insertedId });
      } catch (error) {
        res.status(500).json({ error: "Failed to submit asset request" });
      }
    });

    // assetList.jsx (update)
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          productName: updatedProduct.productName,
          type: updatedProduct.type,
          productQuantity: updatedProduct.productQuantity,
        },
      };
      const result = await productCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // assetList.jsx
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });




  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("AssetNode server is running");
});

app.listen(port, () => {
  console.log(`AssetNode server is running on port ${port}`);
});