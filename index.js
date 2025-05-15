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

    // database collections
      const userCollection = client.db("assetDB").collection("users");
      const productCollection = client.db("assetDB").collection("products");
      const requestCollection = client.db("assetDB").collection("requestProducts");
      const teamCollection = client.db("assetDB").collection("teams");

    // user related apis-------------------------------------------

    // AddEmployee.jsx
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

    app.patch("/updateRequestStatus/:id", async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  try {
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        requestStatus: status,
      },
    };

    const result = await requestCollection.updateOne(filter, updateDoc);

    if (result.modifiedCount > 0) {
      res.send({ message: "Status updated successfully" });
    } else {
      res.status(404).send({ message: "No document found or status already set" });
    }
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});


    // my asset (delete)
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestCollection.deleteOne(query);
      res.send(result);
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

    // assetList.jsx (delete)
    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });



    // team related apis-----------------------------------------------------

    // AddEmployee.jsx

    app.put("/add-to-team/:id", async (req, res) => {
      const userId = req.params.id;
      const { teamId, companyId } = req.body;

      try {
        const db = req.app.locals.db; // MongoDB database instance

        // Step 1: Update user info
        const userUpdateResult = userCollection.updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              teamId: teamId,
              companyId: companyId,
              affiliated: true,
              role: "employee",
            },
          }
        );

        // Step 2: Add user to team members array
        const teamUpdateResult = teamCollection.updateOne(
          { _id: new ObjectId(teamId) },
          {
            $addToSet: { members: new ObjectId(userId) },
          },
          { upsert: true }
        );

        res.status(200).json({
          success: true,
          message: "Employee added to team",
          userModified: userUpdateResult.modifiedCount,
          teamModified: teamUpdateResult.modifiedCount,
        });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });



    // -------------------------------------------------- update korte hobe.
    // MyEmployee.jsx (get all members)
    app.get("/team-members/:teamId", async (req, res) => {
      const db = req.app.locals.db;
      const teamId = req.params.teamId;

      try {
        const team = db.teamCollection.findOne({ _id: new ObjectId(teamId) });

        if (!team) {
          return res
            .status(404)
            .json({ success: false, message: "Team not found" });
        }

        const memberIds = team.members || [];

        const members = db.teamCollection
          .find({ _id: { $in: memberIds.map((id) => new ObjectId(id)) } })
          .project({ name: 1, photo: 1, role: 1 })
          .toArray();

        res.status(200).json({ success: true, members });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });


    // MyEmployee.jsx
    app.put("/remove-from-team/:userId", async (req, res) => {
      const db = req.app.locals.db;
      const userId = req.params.userId;
      const { teamId } = req.body;

      try {
        // Step 1: Remove userId from team's member array
        await db.teamCollection
          .updateOne(
            { _id: new ObjectId(teamId) },
            { $pull: { members: new ObjectId(userId) } }
          );

        // Step 2: Reset user affiliation
        await db.userCollection.updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              affiliated: false,
              teamId: null,
              companyId: null,
              role: "user",
            },
          }
        );

        res.status(200).json({ success: true, message: "Removed from team" });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .json({ success: false, message: "Error removing from team" });
      }
    });

    // -------------------------------------------------


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