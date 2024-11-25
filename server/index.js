const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer'); //MIddleware pour telechargement de fichiers
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const secret = 'your_jwt_secret';




//Connect to mongoose
mongoose.connect('mongodb://localhost:27017/Cars', {
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

const UsersSchema = new mongoose.Schema({
    password : String,
    email : String,
    favorite : [String],
});
const UsersModel = mongoose.model('users', UsersSchema);

const CarsSchema = new mongoose.Schema({
    name: String,
    type : String,
    brand : String,
    power : Number,
    color : String,
    price : Number,
    picture : String //Binaire de l'image
      });
const CarsModel = mongoose.model('cars', CarsSchema);


//Middleware
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());
app.use(express.json()); // Middleware pour parser le JSON

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
    const authHeader  = req.header('Authorization');
    if (!authHeader ) {
        console.log('No Authorization header found');
        return res.status(401).json({ message: 'Access denied' });
    }
    const token  = authHeader.split(' ')[1];
    if (!token ) {
        console.log('No Authorization header found');
        return res.status(401).json({ message: 'Access denied' });
    }
    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      console.log('Token decoded successfully:', decoded);
      next();
    } catch (err) {
        console.error('Invalid token:', err);
        res.status(400).json({ message: 'Invalid token' });
    }
  };

  // Protected route example
app.get('/profile', authenticateJWT, (req, res) => {
    console.log('profile');
    console.log('User profile ', req.user);
    res.json({ message: 'This is a protected route', user: req.user });
  });
  

// Configuration de multer pour le téléchargement de fichiers
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//Connexion
app.post('/Connexion',async (req,res)=>{

    try {
        console.log('req', req.body);
        //const username = req.query.username;
        const password = req.body.password;
        const email = req.body.email;
        //console.log('username', username)
        console.log('password', password);
        console.log('email', email);
        console.log('Try to find account');
        let UserInDB;

        if (email != null && password != null) {
            console.log('Try find UserUnDB');
            const UserInDB = await UsersModel.findOne({ email: email});
            console.log('User in DB ', UserInDB);
            if (UserInDB) {
                console.log('UserInDB pwd ', UserInDB.password);
                const isMatch = await bcrypt.compare(password, UserInDB.password);
                if (!isMatch) {
                    console.log('Invalid email or password');
                    return res.status(400).json({ message: 'Invalid email or password' });
                  }
                console.log('UserinDBFound'); 
                const token = jwt.sign({ userId: UserInDB._id }, secret, { expiresIn: '1h' });
                console.log('end');
                return res.status(200).json({ message: 'User successfully found', token, data: UserInDB });
            } else {
                console.log('User not found :(');
                return res.status(404).json({ message: 'User not found' });
            }
        } else {
        return res.status(400).json({ message: 'email and password are required' });
    }
} catch (error) {
    return res.status(500).json({ message: 'An error occurred', error: error.message });
}
});

//CreateAccount
app.post('/CreateAccount',async (req,res)=>{
        const username = req.body.username;
        const password = req.body.password;
        const email = req.body.email;
        console.log('username', req.data)
        console.log('password', password)
        console.log('email', email)
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new UsersModel({ username, password: hashedPassword, email });
            const result = await newUser.save();
            res.status(201).json({username: result.username});
        } catch (err) {
            console.error('Error fetching users:',err);
            res.status(500).send('Internal Server Error');
        }
    });
    
//ShowCars - GET
app.get('/ShowCars',async (req,res)=>{
    try {
    const name = req.body.name;
    let CarsInDataBase;

    if (name != null) {
        CarsInDataBase = await CarsModel.find({ name: name });
    } else {
        CarsInDataBase = await CarsModel.find();
    } 
    res.status(200).json({ message: 'Car successfully found', data: CarsInDataBase });
}catch (error) {
    res.status(500).json({ message: 'An error occurred', error: error.message });
}});

//ShowCars - GET
app.get('/ShowFavoriteCars',async (req,res)=>{
    console.log('Received request to show favorite');
    let CarsInFavorite
    try{
        console.log('Req : ', req.query);
        const userId = req.query.userId;
     // Vérifiez que le nom est fourni
        if (!userId) {
            return res.status(400).json({ error: 'User is required' });
        }
        // Recherchez l'utilisateur par son ID
        const user = await UsersModel.findById(userId);
        console.log('user id found,' , user)
        // Vérifiez si l'utilisateur existe
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Vérifiez si le CarID est déjà dans les favoris
        favoriteCarIds = user.favorite;
        console.log('Cars in favorite,' , favoriteCarIds)
        const favoriteCars = await CarsModel.find({ _id: { $in: favoriteCarIds } });
    res.status(200).json({ message: 'Car successfully found', data: favoriteCars  });
}catch (error) {
    res.status(500).json({ message: 'An error occurred', error: error.message });
}});

//AddCar - POST
app.post('/AddCar',upload.single('picture'),async (req,res)=>{
    console.log('Received POST request on /AddCar');
   /*  const name = req.body.params.name;
    const type = req.body.params.type;
    const brand = req.body.params.brand;
    const power = req.body.params.power;
    const color = req.body.params.color;
    const price = req.body.params.price;
    const picture = req.file ? req.file.buffer : null; */
    try{
        const { name, type, brand, power, color, price, picture} = req.body;
        const newCar = new CarsModel({name, type, brand, power, color, price, picture});
        const result = await newCar.save();
        console.log('Car aded to database', result);
        res.status(201).json({ name: result.name });
    } catch (err){
        console.error('Error adding car:',err);
        res.status(500).send('Internal Server Error');
    }
    
})

//RemoveCars - DELETE
app.delete('/RemoveCars', async (req,res)=>{
    console.log('Received Delete request on /RemoveCars');
    try{
        const _id = req.query._id;
        console.log('ID Is ', req.query._id)
        // Vérifiez que le nom est fourni
        if (!_id) {
            return res.status(400).json({ error: '_id is required'});
        }
        const result = await CarsModel.findOneAndDelete({ _id: _id });

           // Vérifiez si une entrée a été supprimée
        if (!result) {
            return res.status(404).json({ error: 'Car not found' });
        }
        // Réponse en cas de succès
        res.status(200).json({ message: 'Car successfully removed' });
    } catch (err){
        console.error('Error removing car:',err);
        res.status(500).send('Internal Server Error'); 
    }
})

//ModifyCars - MODIFY
app.post('/ModifyCars', async (req,res)=>{
    console.log('Received Delete request on /ModifyCars');
    try{
        const oldname = req.body.oldname;
        const newname = req.body.newname;
        // Vérifiez que le nom est fourni
        if (!oldname) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const result = await CarsModel.findOneAndUpdate({ name: oldname },{ name: newname});

           // Vérifiez si une entrée a été modifiée
        if (!result) {
            return res.status(404).json({ error: 'Car not found' });
        }
        // Réponse en cas de succès
        res.status(200).json({ message: 'Car successfully modified' });
    } catch (err){
        console.error('Error modifing car:',err);
        res.status(500).send('Internal Server Error'); 
    }
})

//Favorite - FAVORITE
app.post('/Favorite', async (req,res)=>{
    console.log('Received add to favorite request on /Favorite');
    try{
        console.log('Req.Body : ', req.body);
        const CarID = req.body.carid;
        const UserID = req.body.userID;
        
        // Vérifiez que le nom est fourni
        if (!UserID) {
            return res.status(400).json({ error: 'User is required' });
        }
        // Recherchez l'utilisateur par son ID
        const user = await UsersModel.findById(UserID);
        console.log('user id found,' , user)
        // Vérifiez si l'utilisateur existe
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Vérifiez si le CarID est déjà dans les favoris
        if (user.favorite.includes(CarID)) {
            console.error('Car already present in favorites')
            return res.status(400).json({ error: 'Car already present in favorites' });
        }
         // Ajoutez le CarID aux favoris
        user.favorite.push(CarID);
        await user.save();
        console.log('Car added to favorite', CarID);

        // Réponse en cas de succès
        res.status(200).json({ message: 'Car successfully added' });
    } catch (err){
        console.error('Error adding car to favorite:',err);
        res.status(500).send('Internal Server Error'); 
    }
})

//RemoveFavorite - Remov FAVORITE - fonction non faite
app.delete('/RemoveFavorite', async (req,res)=>{
    console.log('Received remove from favorite request on /RemoveFavorite');
    try{
        console.log('Req.Body : ', req.query);
        const CarID = req.query.carid;
        const UserID = req.query.userId;
        
        // Vérifiez que le nom est fourni
        if (!UserID) {
            return res.status(400).json({ error: 'User is required' });
        }
        // Recherchez l'utilisateur par son ID
        const user = await UsersModel.findById(UserID);
        console.log('user id found,' , user)
        // Vérifiez si l'utilisateur existe
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Vérifiez si le CarID est déjà dans les favoris
        if (user.favorite.includes(CarID)) {
            console.log('Car present in favorites')
            user.favorite = user.favorite.filter(id=> id !== CarID);
            await user.save();
            console.log('Car removed from favorite', CarID);
            res.status(200).json({ message: 'Car successfully added' });
        } else 
        {
            console.log('Car is not present in favorites');
            return res.status(400).json({ error: 'Car is not present in favorites' });
        }

        // Réponse en cas d'erreur
    } catch (err){
        console.error('Error adding car to favorite:',err);
        res.status(500).send('Internal Server Error'); 
    }
})

app.listen(8080,()=>{
    console.log('server listening on port 8080');
})