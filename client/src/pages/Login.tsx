import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth";
import { validateAndDecodeToken, TokenValidationError } from "@/utils/jwt";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const loginFormSchema = z.object({
  username: z.string()
    .min(3, "Il nome utente deve contenere almeno 3 caratteri")
    .max(50, "Il nome utente non può superare i 50 caratteri")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Il nome utente può contenere solo lettere, numeri e underscore (_)"
    ),
  password: z.string()
    .min(8, "La password deve contenere almeno 8 caratteri")
    .max(100, "La password non può superare i 100 caratteri")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      "La password deve contenere almeno:\n" +
      "- Una lettera maiuscola\n" +
      "- Una lettera minuscola\n" +
      "- Un numero\n" +
      "- Un carattere speciale (@$!%*?&)"
    )
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const redirectTo = new URLSearchParams(window.location.search).get("redirectTo") || "/admin";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setNetworkError(null);

    try {
      // Validate form data
      const validationResult = loginFormSchema.safeParse(data);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map(issue => issue.message).join("\n");
        form.setError("root", {
          message: `Errori di validazione:\n${errorMessages}`,
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
        const errorData = await response.json().catch(() => ({ 
          message: 'Si è verificato un errore sconosciuto' 
        }));
        
        switch (response.status) {
          case 400:
            form.setError("root", {
              message: errorData.message || 
                "I dati inseriti non sono validi. Verifica i requisiti di username e password.",
            });
            return;
            
          case 401:
            form.setError("root", {
              message: "Nome utente o password non validi",
            });
            return;
            
          case 429:
            form.setError("root", {
              message: "Troppi tentativi di accesso. Per favore riprova più tardi.",
            });
            return;
            
          case 403:
            form.setError("root", {
              message: "Non hai i permessi necessari per accedere all'area amministrativa.",
            });
            return;
            
          case 500:
            throw new Error("Errore del server");
            
          default:
            throw new Error(errorData.message || "Errore di autenticazione");
        }
      }

      const { token } = await response.json();
      
      try {
        validateAndDecodeToken(token);
      } catch (error) {
        console.error('Token validation error:', error);
        throw new Error(
          error instanceof TokenValidationError
            ? `Errore di autenticazione: ${error.message}`
            : "Errore di validazione del token"
        );
      }

      login(token);
      setLocation(redirectTo);
    } catch (error) {
      console.error('Login error:', error);
      
      if (!navigator.onLine) {
        setNetworkError("Errore di rete. Verifica la tua connessione internet.");
        return;
      }

      setNetworkError(
        error instanceof Error 
          ? error.message
          : "Si è verificato un errore imprevisto. Per favore riprova."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accesso Admin</CardTitle>
          <CardDescription>
            Inserisci le tue credenziali per accedere al pannello di amministrazione
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
                    <FormLabel>Nome utente</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        disabled={isLoading}
                        autoComplete="username"
                      />
                    </FormControl>
                    <FormDescription>
                      Usa solo lettere, numeri e underscore (_)
                    </FormDescription>
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
                      <Input 
                        type="password" 
                        {...field} 
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormDescription>
                      La password deve contenere almeno 8 caratteri, inclusi maiuscole,
                      minuscole, numeri e caratteri speciali
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(form.formState.errors.root || networkError) && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {form.formState.errors.root?.message || networkError}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !form.formState.isValid}
              >
                {isLoading ? "Accesso in corso..." : "Accedi"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
