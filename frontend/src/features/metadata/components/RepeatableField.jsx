import React from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { Input } from "../../../components/UI/input";
import { Label } from "../../../components/UI/label";
import { Button } from "../../../components/UI/Button";

export const RepeatableField = ({ label, values, setValues, placeholder }) => {
  const addField = () => setValues([...values, ""]);
  const removeField = (index) =>
    setValues(values.filter((_, i) => i !== index));
  const updateField = (index, value) => {
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);
  };

  return (
    <div>
      <Label className="block mb-1">{label}</Label>
      {values.map((value, index) => (
        <div key={index} className="flex items-center mb-2 gap-2">
          <Input
            type="text"
            value={value}
            onChange={(e) => updateField(index, e.target.value)}
            placeholder={placeholder}
            className="flex-grow"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={() => removeField(index)}
          >
            <Trash2 size={18} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addField}
        className="flex items-center text-blue-600 hover:text-blue-800 p-0 hover:bg-transparent"
      >
        <PlusCircle size={16} className="mr-1" />
        Add {label}
      </Button>
    </div>
  );
};
