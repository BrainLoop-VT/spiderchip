import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import globalConfig from "../config/global";
import { UserRequest, UserResponse } from "../models/User";
import { InternalServerError, UnauthorizedError } from "../errors";
import { createUser, getUserByEmail, getUserById } from "./userService";

export const registerUser = async (user: UserRequest): Promise<UserResponse> => {
    const { username, email, password } = user;
    const newUser = await createUser(username, email, password)
    
    try {
        const token = jwt.sign({ id: newUser.id }, globalConfig.jwt.secret, {
            expiresIn: globalConfig.jwt.expiresIn
        });
        return { token };
    } catch (error) {
        throw new InternalServerError("Failed to generate authentication token");
    }
};

export const loginUser = async (user: Pick<UserRequest, "email" | "password">): Promise<UserResponse | null> => {
    const userRecord = await getUserByEmail(user.email);
    const isValidPassword = await bcrypt.compare(user.password, userRecord.hashed_password);
    if (!isValidPassword) {
        throw new UnauthorizedError("Invalid password");
    };

    try {
        const token = jwt.sign({ id: userRecord.id }, globalConfig.jwt.secret, {
            expiresIn: globalConfig.jwt.expiresIn
        });
    
        return { token };
    } catch (error) {
        throw new InternalServerError("Failed to generate authentication token");
    }
};

export const getCurrentUser = async (userId: string): Promise<Omit<UserRequest, | "password"> & { role: string } | null>=> {
    const user = await getUserById(userId);
    return { 
        username: user.username,
        email: user.email,
        role: user.roles?.name
    };
};