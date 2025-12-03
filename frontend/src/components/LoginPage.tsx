import { useState } from 'react';
import { Wallet, LogIn } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { login } from '../api';

interface LoginPageProps {
  onLogin: (token: string, username: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login submit', { username, password }); // <-- debug
    setError(null);
    setLoading(true);
    try {
      const res = await login(username, password);
      console.log('login response', res); // <-- debug
      if (res?.access_token) {
        onLogin(res.access_token, username);
      } else {
        setError('Nieprawidłowe dane logowania');
      }
    } catch (err: any) {
      console.error('login error', err);
      setError(err?.message || 'Błąd sieciowy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#B983FF" }}>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto p-4 rounded-2xl w-fit" style={{ backgroundColor: "#94B3FD" }}>
            <Wallet className="w-12 h-12 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">Menedżer Finansów</CardTitle>
            <CardDescription>
              Zaloguj się do swojego konta
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Login</Label>
              <Input
                id="username"
                type="text"
                placeholder="twojlogin123"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full gap-2" style={{ backgroundColor: "#94DAFF", color: "#000000" }}>
              <LogIn className="w-4 h-4"/>
              Zaloguj się
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
