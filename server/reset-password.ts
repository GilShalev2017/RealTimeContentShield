import { db } from './db';
import { hashPassword } from './auth-utils';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function resetUserPassword() {
  console.log('Resetting admin password...');
  
  try {
    // Hash the password
    const hashedPassword = await hashPassword('password123');
    
    // Update the user's password in the database
    const updatedUser = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, 'admin'))
      .returning();
    
    console.log('Password reset successfully for user:', updatedUser[0].username);
  } catch (error) {
    console.error('Error resetting password:', error);
  }
}

// Run the function
resetUserPassword().then(() => process.exit());