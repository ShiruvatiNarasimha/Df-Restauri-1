import type { Express } from "express";

export function registerRoutes(app: Express) {
  app.post("/api/contact", (req, res) => {
    const { name, email, phone, message } = req.body;
    
    // Here you would typically send an email or store the contact request
    console.log("Contact form submission:", { name, email, phone, message });
    
    res.json({ success: true });
  });
}
