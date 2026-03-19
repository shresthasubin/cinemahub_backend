import User from "../model/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Hall from "../model/hall.model.js";

// user register
const userRegister = async (req, res) => {
  try {
    const { fullname, email, password, agreeTerm } = req.body;
    const userExist = await User.findOne({
      where: { email },
    });

    if (userExist) {
      return res.status(400).json({
        success: false,
        message: "User already exist",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullname,
      email,
      password: hashedPassword,
      agreeTerm,
      role: "user",
    });

    return res.status(201).json({
      success: true,
      message: "User registered Successfully",
      data: user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed to register user",
      error: err.message,
    });
  }
};

// user login
const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userExist = await User.findOne({
      where: {
        email,
        isDeleted: false,
      },
    });
    if (!userExist) {
      return res.status(404).json({
        success: false,
        message: "User doesn't exist",
      });
    }

    const isMatch = await bcrypt.compare(password, userExist.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: userExist.id,
        email: userExist.email,
        role: userExist.role,
        license: userExist.license
      },
      process.env.TOKEN_SECRET,
      {
        expiresIn: "1h",
      },
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'lax',
      expires: new Date(Date.now() + 3600000),
    });

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      data: {
        userExist,
        token
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed: Login",
      error: err.message,
    });
  }
};

// user delete
const userDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const intId = parseInt(id);
    if (!Number.isInteger(intId) || intId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid Id",
      });
    }
    const user = await User.findByPk(intId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with id doesn't exist",
      });
    }

    if (user.role !== "admin") {
      user.isDeleted = true;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "user has been deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Failed: Cannot Delete",
      error: err.message,
    });
  }
};

// getting all user
const userGetAll = async (req, res) => {
  try {
    const allUser = await User.findAll();

    return res.status(200).json({
      success: true,
      message: "Successfully obtained all users, including deleted ones",
      data: allUser,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error, cannot fetch all user",
      error: err.message,
    });
  }
};

// updating role of user
const userRoleUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const intId = parseInt(id);
    const user = await User.findByPk(intId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with id doesn't exist",
      });
    }

    const { role } = req.body;
    if (req.user.role == "admin") {
      user.role = role;
      await user.save();
    } else {
      return res.status(401).json({
        success: false,
        message: "User has no privilege to change role",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Role has been changed to ${role}`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server failed: Cannot Update Data",
      error: err.message,
    });
  }
};

// updating user
const userUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not available",
      });
    }

    const { fullname, email, password, license } = req.body;
    const updates = {};

    if (typeof fullname === "string" && fullname.trim()) {
      updates.fullname = fullname.trim();
    }

    if (typeof email === "string" && email.trim()) {
      updates.email = email.trim();
    }

    if (typeof password === "string" && password.trim()) {
      updates.password = await bcrypt.hash(password.trim(), 10);
    }

    if (typeof license === "string" && license.trim()) {
      updates.license = license.trim()
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    await user.update(updates);

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error: Cannot update user",
      error: err.message,
    });
  }
};

// get current user info
const userMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "fullname", "email", "role"],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error: Cannot fetch user",
      error: err.message,
    });
  }
};

// user logout
const userLogout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error: Cannot logout",
      error: err.message,
    });
  }
};


export {
  userRegister,
  userLogin,
  userDelete,
  userGetAll,
  userRoleUpdate,
  userMe,
  userLogout,
  userUpdate,
};
