import * as React from 'react';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { AuthContext } from '../contexts/AuthContext';
import '../styles/Authentication.css';

const REMEMBERED_USERNAME_KEY = 'linkmeet_remembered_username';

export default function Authentication() {

    const [formState, setFormState] = React.useState(0); // 0 = sign in, 1 = sign up

    const [name, setName] = React.useState('');
    const [username, setUsername] = React.useState(() => localStorage.getItem(REMEMBERED_USERNAME_KEY) || '');
    const [password, setPassword] = React.useState('');
    const [rememberMe, setRememberMe] = React.useState(() => Boolean(localStorage.getItem(REMEMBERED_USERNAME_KEY)));
    const [showPassword, setShowPassword] = React.useState(false);

    const [error, setError] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [open, setOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);

    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    let handleSwitchForm = (nextState) => {
        setFormState(nextState);
        setError('');
    }

    let handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            if (formState === 0) {
                await handleLogin(username, password);

                if (rememberMe) {
                    localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
                } else {
                    localStorage.removeItem(REMEMBERED_USERNAME_KEY);
                }
            }

            if (formState === 1) {
                let result = await handleRegister(name, username, password);
                setName('');
                setUsername('');
                setPassword('');
                setMessage(result);
                setOpen(true);
                setFormState(0);
            }
        } catch (err) {
            console.log(err);
            setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="auth-page">

            <div className="auth-visual">
                <span className="auth-blob auth-blob--a" aria-hidden="true"></span>
                <span className="auth-blob auth-blob--b" aria-hidden="true"></span>

                <div className="auth-visual-content">
                    <div className="auth-logo-frame">
                        <span className="auth-corner auth-corner-tl" aria-hidden="true"></span>
                        <span className="auth-corner auth-corner-tr" aria-hidden="true"></span>
                        <span className="auth-corner auth-corner-bl" aria-hidden="true"></span>
                        <span className="auth-corner auth-corner-br" aria-hidden="true"></span>
                        <div className="auth-logo-badge">
                            <img src="/logo3.png" alt="LinkMeet logo" className="auth-logo" />
                        </div>
                    </div>
                    <h2 className="auth-visual-title">Connect. Meet. Together.</h2>
                    <p className="auth-visual-subtitle">
                        Quality video calls, made simple. Sign in to jump back into a meeting, or create an account to get started.
                    </p>
                </div>
            </div>

            <div className="auth-panel">
                <div className="auth-card">

                    <div className="auth-tabs" role="tablist" aria-label="Sign in or create an account">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={formState === 0}
                            className={`auth-tab ${formState === 0 ? 'auth-tab--active' : ''}`}
                            onClick={() => handleSwitchForm(0)}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={formState === 1}
                            className={`auth-tab ${formState === 1 ? 'auth-tab--active' : ''}`}
                            onClick={() => handleSwitchForm(1)}
                        >
                            Sign Up
                        </button>
                    </div>

                    <h1 className="auth-title">{formState === 0 ? 'Welcome back' : 'Create your account'}</h1>
                    <p className="auth-subtitle">
                        {formState === 0 ? 'Sign in to join or start a meeting.' : 'It only takes a minute to get started.'}
                    </p>

                    <form className="auth-form" noValidate onSubmit={handleAuth}>

                        {formState === 1 && (
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="name"
                                label="Full Name"
                                name="name"
                                value={name}
                                autoFocus
                                className="auth-input"
                                onChange={(e) => setName(e.target.value)}
                            />
                        )}

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Username"
                            name="username"
                            value={username}
                            autoFocus={formState === 0}
                            className="auth-input"
                            onChange={(e) => setUsername(e.target.value)}
                        />

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="password"
                            name="password"
                            label="Password"
                            value={password}
                            type={showPassword ? 'text' : 'password'}
                            className="auth-input"
                            onChange={(e) => setPassword(e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        {formState === 0 && (
                            <FormControlLabel
                                className="auth-remember"
                                control={
                                    <Checkbox
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        size="small"
                                    />
                                }
                                label="Remember my username"
                            />
                        )}

                        {error && <Alert severity="error" className="auth-alert">{error}</Alert>}

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={submitting}
                            className="btn-primary auth-submit"
                        >
                            {submitting ? 'Please wait…' : (formState === 0 ? 'Sign In' : 'Create account')}
                        </Button>

                    </form>

                </div>
            </div>

            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert onClose={() => setOpen(false)} severity="success" variant="filled" className="auth-snackbar-alert">
                    {message}
                </Alert>
            </Snackbar>

        </div>
    );
}