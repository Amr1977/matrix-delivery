const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'backend', 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

console.log('Applying cookie authentication patches...\n');

// Patch 1: Update verifyToken to check cookies first
const verifyTokenOld = `const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];`;

const verifyTokenNew = `const verifyToken = (req, res, next) => {
  // Check for token in cookies first (preferred method)
  let token = req.cookies?.token;
  
  // Fall back to Authorization header for backward compatibility
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader?.split(' ')[1];
  }`;

if (content.includes(verifyTokenOld)) {
    content = content.replace(verifyTokenOld, verifyTokenNew);
    console.log('✅ Patch 1: Updated verifyToken middleware');
} else {
    console.log('⚠️  Patch 1: verifyToken already updated or pattern not found');
}

// Patch 2: Update signup to set cookie and remove token from response
const signupTokenOld = `    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const duration = Date.now() - startTime;`;

const signupTokenNew = `    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { 
        expiresIn: '30d',
        issuer: 'matrix-delivery',
        audience: 'matrix-delivery-api'
      }
    );

    // Set httpOnly cookie for security
    res.cookie('token', token, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    const duration = Date.now() - startTime;`;

if (content.includes(signupTokenOld)) {
    content = content.replace(signupTokenOld, signupTokenNew);
    console.log('✅ Patch 2: Updated signup to set httpOnly cookie');
} else {
    console.log('⚠️  Patch 2: Signup already updated or pattern not found');
}

// Patch 3: Remove token from signup response
const signupResponseOld = `    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {`;

const signupResponseNew = `    res.status(201).json({
      message: 'User registered successfully',
      user: {`;

if (content.includes(signupResponseOld)) {
    content = content.replace(signupResponseOld, signupResponseNew);
    console.log('✅ Patch 3: Removed token from signup response');
} else {
    console.log('⚠️  Patch 3: Signup response already updated');
}

// Patch 4: Update login to set cookie
const loginTokenOld = `    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const duration = Date.now() - startTime;`;

const loginTokenNew = `    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { 
        expiresIn: '30d',
        issuer: 'matrix-delivery',
        audience: 'matrix-delivery-api'
      }
    );

    // Set httpOnly cookie for security
    res.cookie('token', token, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    const duration = Date.now() - startTime;`;

if (content.includes(loginTokenOld)) {
    content = content.replace(loginTokenOld, loginTokenNew);
    console.log('✅ Patch 4: Updated login to set httpOnly cookie');
} else {
    console.log('⚠️  Patch 4: Login already updated or pattern not found');
}

// Patch 5: Remove token from login response and add roles
const loginResponseOld = `    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        rating: parseFloat(user.rating),
        completedDeliveries: user.completed_deliveries,
        country: user.country,
        city: user.city,
        area: user.area
      }
    });`;

const loginResponseNew = `    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        rating: parseFloat(user.rating),
        completedDeliveries: user.completed_deliveries,
        country: user.country,
        city: user.city,
        area: user.area,
        roles: user.roles || [user.role]
      }
    });`;

if (content.includes(loginResponseOld)) {
    content = content.replace(loginResponseOld, loginResponseNew);
    console.log('✅ Patch 5: Removed token from login response and added roles');
} else {
    console.log('⚠️  Patch 5: Login response already updated');
}

// Write the patched content
fs.writeFileSync(serverPath, content, 'utf8');
console.log('\n✅ All patches applied successfully!');
