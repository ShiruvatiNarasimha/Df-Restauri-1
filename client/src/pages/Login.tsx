import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth";
import { jwtDecode } from "jwt-decode";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";

const loginFormSchema = z.object({
  username: z.string().min(1, "Il nome utente è obbligatorio").trim(),
  password: z.string().min(1, "La password è obbligatoria")
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const redirectTo = new URLSearchParams(window.location.search).get("redirectTo") || "/admin";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      // Validate form data
      const validationResult = loginFormSchema.safeParse(data);
      if (!validationResult.success) {
        form.setError("root", {
          message: "Verifica i dati inseriti",
        });
        return;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        
        if (response.status === 401) {
          form.setError("root", {
            message: "Nome utente o password non validi",
          });
          return;
        }
        
        if (response.status === 429) {
          form.setError("root", {
            message: "Troppi tentativi di accesso. Per favore riprova più tardi.",
          });
          return;
        }
        
        throw new Error(errorData.message || 'Login failed');
      }

      const { token } = await response.json();
      
      // Update the token validation
      try {
        const decoded = jwtDecode(token);
        if (!decoded || typeof decoded !== 'object') {
          throw new Error('Invalid token format');
        }
      } catch (error) {
        form.setError("root", {
          message: "Errore di autenticazione. Per favore riprova.",
        });
        return;
      }

      login(token);
      setLocation(redirectTo);
    } catch (error) {
      console.error('Login error:', error);
      
      if (!navigator.onLine) {
        form.setError("root", {
          message: "Errore di rete. Verifica la tua connessione internet.",
        });
        return;
      }

      form.setError("root", {
        message: error instanceof Error 
          ? error.message
          : "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && (
                <div className="text-sm font-medium text-destructive">
                  {form.formState.errors.root.message}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
