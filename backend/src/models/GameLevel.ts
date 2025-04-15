import { LevelInput } from "./LevelInput";

export class GameLevel {
    id: string;
    title: string;
    description: string;
    preDescription?: string;
    inputData: LevelInput;
    createdAt: Date;
    updatedAt: Date;

    constructor(data: any) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.preDescription = data.pre_description;
        this.inputData = new LevelInput(data.input_data);
        this.createdAt = new Date(data.created_at);
        this.updatedAt = new Date(data.updated_at);
    }

    // Method to convert back to database format
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            pre_description: this.preDescription,
            input_data: this.inputData.toJSON(),
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };
    }
}