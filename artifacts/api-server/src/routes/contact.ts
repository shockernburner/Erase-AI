import { Router, type IRouter, type Request, type Response } from "express";
import { db, contactInquiriesTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/contact", async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };

    if (!name || !email || !subject || !message) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    if (name.trim().length === 0 || name.length > 200) {
      res.status(400).json({ error: "Name must be between 1 and 200 characters" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }

    if (subject.trim().length === 0 || subject.length > 500) {
      res.status(400).json({ error: "Subject must be between 1 and 500 characters" });
      return;
    }

    if (message.trim().length === 0 || message.length > 5000) {
      res.status(400).json({ error: "Message must be between 1 and 5000 characters" });
      return;
    }

    await db.insert(contactInquiriesTable).values({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({ error: "Failed to submit inquiry" });
  }
});

export default router;
