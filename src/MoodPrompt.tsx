import { useState } from "react";

interface MoodPromptProps {
  onSubmit: (formData: { mood: number }) => void;
  onClose: () => void;
}

export const MoodPrompt: React.FC<MoodPromptProps> = ({
  onSubmit,
  onClose,
}) => {
  const [mood, setMood] = useState<number>(5);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = {
      mood,
    };
    onSubmit(formData);
  };

  return (
    <div className="modal">
      <form className="mood-form" onSubmit={handleSubmit}>
        <div>
          <label>Mood Rating</label>
          <input
            type="range"
            min="1"
            max="5"
            value={mood}
            onChange={(e) => setMood(parseInt(e.target.value))}
          />
          <span>{mood}</span>
        </div>
        <button type="submit">Submit</button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </form>
    </div>
  );
};
