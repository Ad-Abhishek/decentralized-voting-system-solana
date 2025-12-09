import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface OptionAttributes {
  id: number;
  pollId: number;
  optionText: string;
  optionIndex: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OptionCreationAttributes extends Optional<OptionAttributes, 'id'> {}

class Option extends Model<OptionAttributes, OptionCreationAttributes> implements OptionAttributes {
  public id!: number;
  public pollId!: number;
  public optionText!: string;
  public optionIndex!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Option.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    pollId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'polls',
        key: 'id',
      },
    },
    optionText: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    optionIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'options',
  }
);

export default Option;
