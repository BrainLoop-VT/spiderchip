import { NextFunction, Request, Response } from "express";
import { registerUser, loginUser, getCurrentUser } from "../services/authService";
import { UserRequest } from "../models/User";
import { UnauthorizedError } from "../errors";

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user: UserRequest = req.body;
    const newUser = await registerUser(user);
    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user: Pick<UserRequest, "email" | "password"> = req.body;
    const authData = await loginUser(user);
    res.status(200).json(authData);
  } catch (error) {
    next(error);
  }
};

export const currentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedError("Unauthorized. No user found.")
    }

    const user = await getCurrentUser(req.user.id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};