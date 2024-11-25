import * as React from "react";
import { useCallback, useState } from "react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Input } from "./input";

export function AdminButton() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Errore durante il login");
      }

      if (!data.user.isAdmin) {
        throw new Error("Accesso non autorizzato");
      }

      window.location.href = "/admin-realizzazioni";
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : "Errore durante il login");
    }
  }, [username, password]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-foreground hover:text-foreground">Admin Access</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Admin Access</DialogTitle>
          <DialogDescription>
            Inserisci le tue credenziali di amministratore per accedere al pannello admin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLogin} className="grid gap-4 py-4">
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <div className="grid gap-2">
            <label htmlFor="username">Username</label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="password">Password</label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit">Login</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
