import { getPrisma } from "../config/db";
import { ConflictError, InternalServerError, NotFoundError } from "../errors";

/**
 * Fetch all roles
 */
export const getAllRoles = async () => {
    const prisma = await getPrisma();
    try {
        return await prisma.roles.findMany();
    } catch (error) {
        throw new InternalServerError("Failed to fetch all roles.");
    }
};

/**
 * Fetch a role by ID
 */
export const getRoleById = async (id: string) => {
    const prisma = await getPrisma();
    try {
        const role = await prisma.roles.findUnique({ where: { id } });
        if (!role) {
            throw new NotFoundError(`Role with ID ${id} not found.`);
        }

        return role;
    } catch (error) {
        throw new InternalServerError(`Failed to fetch role with ID: ${id}`);
    }
};

/**
 * Fetch a role by name
 */
export const getRoleByName = async (name: string) => {
    const prisma = await getPrisma();
    try {
        const role = await prisma.roles.findUnique({ where: { name } });
        if (!role) {
            throw new NotFoundError(`Role with name ${name} not found.`);
        }

        return role;
    } catch (error) {
        throw new InternalServerError(`Failed to fetch role with name: ${name}`);
    }
};

/**
 * Create a new role
 */
export const createRole = async (roleData: { name: string; description?: string }) => {
    const prisma = await getPrisma();
    const existingRole = await prisma.roles.findUnique({
        where: { name: roleData.name }
    });

    if (existingRole) {
        throw new ConflictError(`Role '${roleData.name}' already exists`);
    }

    try {
        return await prisma.roles.create({
            data: roleData
        });
    } catch (error) {
        throw new InternalServerError("Failed to create role");
    }
};

/**
 * Update a role by ID
 */
export const updateRole = async (id: string, roleData: { name?: string; description?: string }) => {
    const prisma = await getPrisma();
    const existingRole = await prisma.roles.findUnique({ where: { id } });

    if (!existingRole) {
        throw new NotFoundError(`Role with ID ${id} not found`);
    }

    try {
        return await prisma.roles.update({
            where: { id },
            data: roleData
        });
    } catch (error) {
        throw new InternalServerError("Failed to update role");
    }
};

/**
 * Delete a role by ID
 */
export const deleteRole = async (id: string) => {
    const prisma = await getPrisma();
    const existingRole = await prisma.roles.findUnique({ where: { id } });

    if (!existingRole) {
        throw new NotFoundError(`Role with ID ${id} not found`);
    }

    // Check if any users are using this role
    const usersWithRole = await prisma.users.count({
        where: { role_id: id }
    });

    if (usersWithRole > 0) {
        throw new ConflictError(`Cannot delete role. ${usersWithRole} user(s) are assigned to this role.`);
    }

    try {
        return await prisma.roles.delete({
            where: { id }
        });
    } catch (error) {
        throw new InternalServerError("Failed to delete role");
    }
};