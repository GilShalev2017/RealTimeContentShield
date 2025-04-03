import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as UserType } from "@shared/schema";
import { hashPassword, verifyPassword } from "./auth-utils";

// Setup types for Express session
declare global {
  namespace Express {
    interface User extends UserType {}
  }
}

// Use database session store with the storage class

// Setup authentication middleware
export function setupAuth(app: Express) {
  // Session configuration
  const sessionOptions: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "moderator-platform-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };

  // Set up session middleware
  app.use(session(sessionOptions));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport local strategy for username/password auth
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        const isPasswordValid = await verifyPassword(password, user.password);
        
        if (!isPasswordValid) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize and deserialize user for session management
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  
  // Register a new user
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { username, password, name, role } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        role
      });
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      // Log user in after registration
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  // Login route
  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user as Express.User & { password: string };
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user route
  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = req.user as Express.User & { password: string };
    res.json(userWithoutPassword);
  });

  // Check server status - always returns 200 for server health check
  app.get("/api/auth/check", (req: Request, res: Response) => {
    // Always return 200 OK to indicate server is alive, regardless of auth status
    return res.status(200).json({ 
      serverStatus: 'available',
      authenticated: req.isAuthenticated()
    });
  });

  // Authentication middleware for protecting routes
  app.use("/api/content*", ensureAuthenticated);
  app.use("/api/content-analysis*", ensureAuthenticated);
  app.use("/api/ai-rules*", ensureAuthenticated);
  app.use("/api/stats*", ensureAuthenticated);
}

// Middleware to ensure a user is authenticated
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized. Please log in." });
}