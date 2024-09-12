import { useState } from "react";

interface MoodPromptProps {
  onSubmit: (formData: { mood: number; description: string }) => void;
  onClose: () => void;
}

export const MoodPrompt: React.FC<MoodPromptProps> = ({
  onSubmit,
  onClose,
}) => {
  const [mood, setMood] = useState<number>(5);
  const [description, setDescription] = useState<string>("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = {
      mood,
      description,
    };
    onSubmit(formData);
  };

  return (
    <div className="modal">
      <form className="mood-form" onSubmit={handleSubmit}>
        <div>
          <label>Mood Rating</label>
          <div>{mood}</div>
          <input
            type="range"
            min="1"
            max="5"
            value={mood}
            onChange={(e) => setMood(parseInt(e.target.value))}
          />
        </div>
        <textarea
          maxLength={75}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit">Submit</button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </form>
    </div>
  );
};
