import { useState } from 'react';
import { Wallet, LogIn, UserPlus, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { login, register } from '../api';

interface LoginPageProps {
  onLogin: (token: string, username: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showRegister, setShowRegister] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [householdStatus, setHouseholdStatus] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(username, password);
      if (res?.access_token) {
        onLogin(res.access_token, username);
      } else {
        setError('Nieprawidłowe dane logowania');
      }
    } catch (err: any) {
      setError(err?.message || 'Błąd sieciowy');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regUsername || !regPassword || !regConfirm || !firstName || !lastName) {
      setRegError('Wypełnij wymagane pola');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('Hasła nie są identyczne');
      return;
    }

    setRegLoading(true);
    try {
      const payload = {
        username: regUsername,
        password: regPassword,
        first_name: firstName,
        last_name: lastName,
        age: age === '' ? null : Number(age),
        household_status: householdStatus || null,
      };

      await register(payload);

      setRegSuccess('Konto utworzone pomyślnie. Możesz się teraz zalogować.');
      setShowRegister(false);
      setRegUsername('');
      setRegPassword('');
      setRegConfirm('');
      setFirstName('');
      setLastName('');
      setAge('');
      setHouseholdStatus('');
    } catch (err: any) {
      setRegError(err?.message || 'Błąd podczas rejestracji');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#B983FF" }}>
      <div className="w-full max-w-md space-y-4">
        {!showRegister ? (
          <Card>
            <CardHeader className="space-y-4 text-center">
              <div className="mx-auto p-4 rounded-2xl w-fit" style={{ backgroundColor: "#94B3FD" }}>
                <Wallet className="w-12 h-12 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Menedżer Finansów</CardTitle>
                <CardDescription>Zaloguj się do swojego konta</CardDescription>
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
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full gap-2" style={{ backgroundColor: "#94DAFF", color: "#000000" }} disabled={loading}>
                  <LogIn className="w-4 h-4" />
                  Zaloguj się
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full gap-2"
                  onClick={() => {
                    setShowRegister(true);
                    setRegError(null);
                    setRegSuccess(null);
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  Załóż konto
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="space-y-4 text-center">
              <div className="mx-auto p-3 rounded-2xl w-fit" style={{ backgroundColor: "#C7F9FF" }}>
                <UserPlus className="w-10 h-10 text-black" />
              </div>
              <div>
                <CardTitle className="text-xl">Rejestracja</CardTitle>
                <CardDescription>
                  Utwórz nowe konto (pola wymagane przez backend)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Login</Label>
                  <Input
                    id="reg-username"
                    type="text"
                    placeholder="nowylogin"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">Imię</Label>
                    <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Nazwisko</Label>
                    <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Hasło</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm">Potwierdź hasło</Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="age">Wiek</Label>
                    <Input id="age" type="number" min={0} value={age === '' ? '' : String(age)} onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="household">Status gospodarstwa</Label>
                    <select id="household" value={householdStatus} onChange={(e) => setHouseholdStatus(e.target.value)} className="w-full border px-3 py-2 rounded">
                      <option value="">Wybierz</option>
                      <option value="single">Samotny/a</option>
                      <option value="couple">Para</option>
                      <option value="family">Rodzina</option>
                      <option value="other">Inne</option>
                    </select>
                  </div>
                </div>

                {regError && <p className="text-sm text-red-600">{regError}</p>}
                {regSuccess && <p className="text-sm text-green-600">{regSuccess}</p>}

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 gap-2" style={{ backgroundColor: "#94DAFF", color: "#000000" }} disabled={regLoading}>
                    Zarejestruj
                  </Button>
                  <Button type="button" variant="ghost" className="gap-2" onClick={() => setShowRegister(false)}>
                    <X className="w-4 h-4" />
                    Anuluj
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// export default LoginPage;