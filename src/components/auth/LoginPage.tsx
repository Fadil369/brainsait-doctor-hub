import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { useAuth } from '../../hooks/useAuth'
import { Eye, EyeOff, Hospital } from 'lucide-react'

interface LoginForm {
  username: string
  password: string
  rememberMe: boolean
}

interface LoginPageProps {
  onLoginSuccess?: () => void
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { login, isLoading, mfaRequired, verifyMFA } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('')
      await login(data.username, data.password, data.rememberMe)
      if (!mfaRequired && onLoginSuccess) {
        onLoginSuccess()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed')
    }
  }

  const handleMFASubmit = async () => {
    try {
      setError('')
      await verifyMFA(mfaCode)
      if (onLoginSuccess) {
        onLoginSuccess()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'MFA verification failed')
    }
  }

  if (mfaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Hospital className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              Multi-Factor Authentication
            </CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="mfa-code">Verification Code</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-lg font-mono tracking-widest"
                  maxLength={6}
                />
                <p className="text-sm text-muted-foreground">
                  Code: 123456 (for demo purposes)
                </p>
              </div>

              <Button
                onClick={handleMFASubmit}
                disabled={mfaCode.length !== 6 || isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>

              <Button
                variant="ghost"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Hospital className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            مركز طبي عيادات الأطباء
          </CardTitle>
          <CardTitle className="text-lg">
            BrainSAIT Doctor Portal
          </CardTitle>
          <CardDescription>
            Secure access for healthcare professionals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                {...register('username', { required: 'Username is required' })}
                className={errors.username ? 'border-destructive' : ''}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password', { required: 'Password is required' })}
                  className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                {...register('rememberMe')}
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal">
                Remember me for 7 days
              </Label>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium text-center mb-2">Demo Accounts</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><strong>🔑 Super Admin:</strong> super.admin / SuperAdmin2024!</p>
              <p><strong>👨‍⚕️ Dr. Fadil (Full Access):</strong> dr.fadil / DrFadil2024!</p>
              <p className="border-t pt-1 mt-1"><strong>Doctor:</strong> dr.ahmed / SecurePass2024!</p>
              <p><strong>Specialist:</strong> dr.sarah / SecurePass2024!</p>
              <p><strong>Nurse:</strong> nurse.maryam / SecurePass2024!</p>
              <p><strong>Admin:</strong> admin.hassan / SecurePass2024!</p>
            </div>
            <p className="text-xs text-center mt-2 text-muted-foreground">
              * MFA code for dr.ahmed: 123456
            </p>
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            <p>✨ Secure healthcare platform by BrainSAIT</p>
            <p className="mt-1">🔒 HIPAA-compliant with Saudi MOH standards</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
