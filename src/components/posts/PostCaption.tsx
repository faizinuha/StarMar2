import { Link } from 'react-router-dom';

interface PostCaptionProps {
  content: string;
}

export const PostCaption = ({ content }: PostCaptionProps) => {
  const words = content.split(/(\s+)/); // Split by space, keeping the spaces

  return (
    <p className="text-sm whitespace-pre-wrap">
      {words.map((word, index) => {
        if (word.startsWith('#')) {
          const tag = word.substring(1);
          // Basic validation for a tag (alphanumeric)
          if (/^[a-zA-Z0-9_]+$/.test(tag)) {
            return (
              <Link
                key={index}
                to={`/explore?tag=${tag}`}
                className="text-primary hover:underline"
              >
                {word}
              </Link>
            );
          }
        }
        return word;
      })}
    </p>
  );
};
