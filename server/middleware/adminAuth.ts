import { Request, Response, NextFunction } from "express";

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).send("Non autenticato");
  }

  if (!req.user.isAdmin) {
    return res.status(403).send("Accesso non autorizzato");
  }

  next();
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).send("Non autenticato");
  }

  next();
}
