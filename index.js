const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRECT_KEY);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-kro96rb-shard-00-00.tkd5xye.mongodb.net:27017,ac-kro96rb-shard-00-01.tkd5xye.mongodb.net:27017,ac-kro96rb-shard-00-02.tkd5xye.mongodb.net:27017/?ssl=true&replicaSet=atlas-11rc2y-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("speakStackDB");
    const users = db.collection("users");
    const posts = db.collection("posts");
    const comments = db.collection("comments");
    const announcements = db.collection("announcements");
    const notifications = db.collection("notifications")
    const reports = db.collection("reports");
    const payments = db.collection("payments");
    const admins = db.collection("admins")
    const tags = db.collection("tags")
    // ========== USERS ==========
    // sociallogin users
    app.patch("/api/users", async (req, res) => {
  try {
    const user = req.body;

    if (!user?.email) {
      return res.status(400).send({ error: "Email is required" });
    }

    const query = { email: user.email };
    const updateDoc = {
      $set: {
        name: user.name || "Unknown",
        photo: user.photo || "",
        role: user.role || "user",
        updatedAt: new Date(),
      },
    };
    const options = { upsert: true };

    const result = await users.updateOne(query, updateDoc, options);
    res.send(result);
  } catch (error) {
    console.error("Error in PATCH /users:", error.message);
    res.status(500).send({ error: "Internal Server Error" });
  }
});


// POST /users
app.post("/users", async (req, res) => {
  try {
    const { name, email, image, badge, role, joinedAt } = req.body;

    // Prevent duplicate entries
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const newUser = { name, email, image, badge, role, joinedAt };
    const result = await users.insertOne(newUser);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get posts by user email
app.get("/posts", async (req, res) => {
  try {
    const email = req.query.email;
    const query = email ? { authorEmail: email } : {};
    const userPosts = await posts.find(query).toArray();
    res.send(userPosts);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch posts" });
  }
});

// Delete post by ID
app.delete("/posts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await posts.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res.send({ message: "Post deleted", deletedCount: 1 });
    } else {
      res.status(404).send({ message: "Post not found", deletedCount: 0 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to delete post" });
  }
});


// // GET user profile by email
app.get('/users/profile/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const user = await users.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Example: GET /api/users/profile/:email
app.get("/api/users/profile/:email", async (req, res) => {
  const email = req.params.email;
  const user = await usersCollection.findOne({ email });
  res.send(user);
});


app.put("/users/membership/:email", async (req, res) => {
  const email = req.params.email;
  const { membership } = req.body;

  if (!membership) {
    return res.status(400).json({ message: "Membership is required" });
  }

  try {
    const userExists = await users.findOne({ email: email });
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await users.updateOne(
      { email: email },
      { $set: { membership: membership } }
    );

    if (result.modifiedCount === 0) {
      return res.status(200).json({ message: "Membership was already set to this value" });
    }

    res.json({ message: "Membership updated successfully" });
  } catch (error) {
    console.error("Error updating membership:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// GET /api/users?search=someName
app.get("/apy/users", async (req, res) => {
  const searchTerm = req.query.search || "";
  try {
    const cursor = users.find({
      name: { $regex: searchTerm, $options: "i" },
    }).project({ password: 0 });

    const result = await cursor.toArray();
    res.json(result);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});


// PATCH /api/users/admin/:id
app.patch("/apy/users/admin/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await users.updateOne(
      { _id: new ObjectId(userId), role: { $ne: "admin" } },
      { $set: { role: "admin" } }
    );

    if (result.modifiedCount > 0) {
      res.json({ message: "User promoted to admin", modifiedCount: result.modifiedCount });
    } else {
      res.json({ message: "No changes made", modifiedCount: 0 });
    }
  } catch (err) {
    console.error("Error updating user role:", err);
    res.status(500).json({ message: "Failed to update user role" });
  }
});

// DELETE /posts/:id
app.delete("/posts/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await posts.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res.send({ success: true });
    } else {
      res.status(404).send({ error: "Post not found" });
    }
  } catch (error) {
    console.error("Delete failed:", error);
    res.status(500).send({ error: "Server error" });
  }
});

// POST /posts - Add a new post
    app.post("/posts", async (req, res) => {
      const postData = req.body;

      // Simple validation
      if (
        !postData.authorEmail ||
        !postData.title ||
        !postData.content ||
        !postData.tags ||
        !Array.isArray(postData.tags)
      ) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Add createdAt if missing
      if (!postData.createdAt) {
        postData.createdAt = new Date().toISOString();
      }

      try {
        const result = await posts.insertOne(postData);
        res.status(201).json({ _id: result.insertedId, ...postData });
      } catch (error) {
        console.error("Error adding post:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // GET /posts/count?userEmail=... - Get count of posts for a user
    app.get("/posts/count", async (req, res) => {
      const { userEmail } = req.query;
      if (!userEmail) {
        return res.status(400).json({ message: "Missing userEmail query param" });
      }

      try {
        const count = await posts.countDocuments({ authorEmail: userEmail });
        res.json({ count });
      } catch (error) {
        console.error("Error counting posts:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });


   // 🔹 GET all posts (newest first)
    app.get("/posts", async (req, res) => {
      const result = await posts.find().sort({ createdAt: -1 }).toArray();
      res.send(result);
    });

    // 🔹 GET posts by tag (case-insensitive match)
    app.get("/posts/tag/:tag", async (req, res) => {
      const tag = req.params.tag.toLowerCase();
      const result = await posts
        .find({ tags: { $in: [tag] } })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

   // GET a single post by ID details post
app.get("/posts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid post ID" });
    }

    const post = await posts.findOne({ _id: new ObjectId(id) });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// comment post details
app.post("/comments", async (req, res) => {
  const newComment = req.body;
  newComment.createdAt = new Date();
  const result = await comments.insertOne(newComment);
  res.send(result);
});
// GET all comments for a given postId
app.get("/comments/:postId", async (req, res) => {
  const { postId } = req.params;

  try {
    const result = await comments
      .find({ postId: postId })
      .toArray();

    res.json(result);
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ message: "Server error" });
  }
});
app.put("/comments/:id", async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const result = await comments.updateOne(
    { _id: new ObjectId(id) },
    { $set: { text } }
  );
  res.send({ modified: result.modifiedCount > 0 });
});
// PATCH /posts/vote/:id

app.patch("/posts/vote/:id", async (req, res) => {
  const { id } = req.params;
  const { type, userEmail } = req.body;

  try {
    const post = await posts.findOne({ _id: new ObjectId(id) });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const upVoters = post.upVoters || [];
    const downVoters = post.downVoters || [];

    const upIndex = upVoters.indexOf(userEmail);
    const downIndex = downVoters.indexOf(userEmail);

    if (type === "upVote") {
      if (upIndex !== -1) {
        upVoters.splice(upIndex, 1); // remove vote
      } else {
        if (downIndex !== -1) downVoters.splice(downIndex, 1);
        upVoters.push(userEmail);
      }
    } else if (type === "downVote") {
      if (downIndex !== -1) {
        downVoters.splice(downIndex, 1); // remove vote
      } else {
        if (upIndex !== -1) upVoters.splice(upIndex, 1);
        downVoters.push(userEmail);
      }
    }

    const updated = {
      $set: {
        upVoters,
        downVoters,
        upVote: upVoters.length,
        downVote: downVoters.length,
      },
    };

    await posts.updateOne({ _id: new ObjectId(id) }, updated);

    const updatedPost = await posts.findOne({ _id: new ObjectId(id) });
    res.json(updatedPost);

  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


    // ========== COMMENTS ==========

    // 1. GET all comments of a post
    app.get("/comments/:postId", async (req, res) => {
      const { postId } = req.params;

      if (!ObjectId.isValid(postId)) {
        return res.status(400).send({ message: "Invalid postId" });
      }

      try {
        const commentsList = await comments
          .find({ postId : new ObjectId(postId) })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(commentsList);
      } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).send({ message: "Server error fetching comments" });
      }
    });

    // 2. POST a new comment
    app.post("/comments", async (req, res) => {
      const comment = req.body;

      // You can add validation here: check required fields like postId, authorEmail, text
      if (!comment.postId || !comment.authorEmail || !comment.comment) {
        return res
          .status(400)
          .send({ message: "Missing required comment fields" });
      }

      if (!ObjectId.isValid(comment.postId)) {
        return res.status(400).send({ message: "Invalid postId" });
      }

      comment.createdAt = new Date();

      try {
        const result = await comments.insertOne(comment);
        res.send(result);
      } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).send({ message: "Server error adding comment" });
      }
    });

    // 3. DELETE comment by ID (for admin or author)
    app.delete("/comments/:id", async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid comment id" });
      }

      try {
        const result = await comments.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Comment not found" });
        }
        res.send({ message: "Comment deleted successfully" });
      } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).send({ message: "Server error deleting comment" });
      }
    });

// ✅ GET: Comments by post ID
    app.get("/api/comments/:postId", async (req, res) => {
      const postId = req.params.postId;
      try {
        const result = await comments
          .find({ postId: postId })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Failed to fetch comments:", error);
        res.status(500).send({ error: "Failed to fetch comments" });
      }
    });

    

      // POST /api/announcements - add announcement
  app.post("/announcements", async (req, res) => {
  const { authorName, authorImage, title, description, date } = req.body;
  
  if (!authorName || !authorImage || !title || !description || !date) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const newAnnouncement = {
      authorName,
      authorImage,
      title,
      description,
      date: new Date(date),
    };

    const result = await announcements.insertOne(newAnnouncement);
    res.status(201).json({ message: "Announcement created", id: result.insertedId });
  } catch (err) {
    console.error("Error creating announcement:", err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});


    // GET /api/announcements - get all announcements sorted by date desc
    app.get("/announcements", async (req, res) => {
      try {
        const result = await announcements
          .find({})
          .sort({ date: -1 })
          .toArray();
        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch announcements" });
      }
    });
app.post("/api/announcements", async (req, res) => {
  const { title, content, date } = req.body;

  try {
    const announcement = {
      title,
      content,
      date: date || new Date(),
    };

    const announceResult = await announcements.insertOne(announcement);

    // Also insert as notification
    await notifications.insertOne({
      title: `📢 New Announcement: ${title}`,
      date: new Date(),
      read: false,
    });

    res.send(announceResult);
  } catch (err) {
    console.error("Failed to post announcement:", err);
    res.status(500).send({ error: "Failed to post announcement" });
  }
});



// 🔔 GET: All notifications (sorted newest first)
app.get("/api/notifications", async (req, res) => {
  try {
    const noti = await notifications
      .find({})
      .sort({ date: -1 })
      .toArray();

    res.send(noti);
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    res.status(500).send({ error: "Failed to fetch notifications" });
  }
});

//  POST: Mark a notification as read
app.post("/api/notifications/:id/read", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await notifications.updateOne(
      { _id: new ObjectId(id) },
      { $set: { read: true } }
    );

    if (result.modifiedCount > 0) {
      res.send({ message: "Notification marked as read" });
    } else {
      res.status(404).send({ error: "Notification not found" });
    }
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

// 🔹 Get admin stats: total posts, comments, users
app.get("/admin/stats", async (req, res) => {
  try {
    const [totalUsers, totalPosts, totalComments] = await Promise.all([
      users.countDocuments(),
      posts.countDocuments(),
      comments.countDocuments(),
    ]);

    //  Fetch first admin 
    const adminInfo = await admins.findOne(); 

    if (!adminInfo) {
      return res.status(404).json({ message: "Admin profile not found" });
    }

    res.json({
      name: adminInfo.name,
      email: adminInfo.email,
      image: adminInfo.image,
      totalUsers,
      totalPosts,
      totalComments,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Failed to get admin stats" });
  }
});


// //  POST /tags - Add a new tag
app.post("/tags", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Tag name is required" });
    }

    // prevent duplicate
    const exists = await tags.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
    if (exists) {
      return res.status(409).json({ message: "Tag already exists" });
    }

    const result = await tags.insertOne({ name });
    res.status(201).json({ insertedId: result.insertedId });
  } catch (err) {
    console.error("Error adding tag:", err);
    res.status(500).json({ message: "Failed to add tag" });
  }
});

//  GET /tags - Fetch all tags
app.get("/tags", async (req, res) => {
  try {
    const result = await tags.find().sort({ name: 1 }).toArray();
    res.json(result);
  } catch (err) {
    console.error("Error fetching tags:", err);
    res.status(500).json({ message: "Failed to fetch tags" });
  }
});
    // //  GET: All Reports
    app.get("/api/reports", async (req, res) => {
      try {
        const result = await reports.find().toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch reports" });
      }
    });





 //  PATCH: Resolve a Report
    app.patch("/api/reports/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await reports.updateOne(
          { _id: new ObjectId(id) },
          { $set: { resolved: true } }
        );
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to update report" });
      }
    });


// POST: Create Report
app.post("/api/reports", async (req, res) => {
  try {
    const report = req.body;
    const result = await reports.insertOne(report);
    res.send(result);
  } catch (error) {
    console.error("Error reporting post:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});



app.post("/api/create-payment-intent", async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).send({ error: "Invalid amount" });
  }

  const amountInCents = Math.round((amount / 100) * 100); 

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd", 
      payment_method_types: ["card"],
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).send({ error: "Failed to create payment intent" });
  }
});

   
    //  POST: Save payment info after successful Stripe payment
app.post("/api/payments", async (req, res) => {
  try {
    const payment = req.body;
    const result = await payments.insertOne(payment);
    res.send(result);
  } catch (err) {
    console.error("Failed to save payment:", err);
    res.status(500).send({ error: "Failed to save payment" });
  }});

//  PATCH: Update user's membership status
app.patch("/api/users/membership/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const { membership } = req.body;

    const result = await users.updateOne(
      { email },
      { $set: { membership } }
    );

    res.send(result);
  } catch (err) {
    console.error("Failed to update membership:", err);
    res.status(500).send({ error: "Membership update failed" });
  }
});

    // ========== ROOT ==========

    app.get("/", (req, res) => {
      res.send(" SpeakStack Server Running");
    });
    console.log(" MongoDB connected");

    app.listen(port, () => {
      console.log(`Server running on port:${port}`);
    });
  } catch (err) {
    console.error("Server Error:", err);
  }
}

run();
