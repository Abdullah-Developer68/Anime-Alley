import { useFormContext } from "react-hook-form";
import { validateComicVolumes } from "../../../../../utils/volume";
import FieldError from "./FieldError";
import { CHIP_CLASS, CHIP_OFF, CHIP_ON, GENRES, INPUT_CLASS, LABEL_CLASS, splitList } from "./constants";

// Genres and volume numbers; stays mounted (hidden) so values survive category switches
const ComicsFields = () => {
  const { register, setValue, watch } = useFormContext();
  const selectedCategory = watch("category");
  const genres = splitList(watch("genres"));

  const toggleGenre = (genre, checked) => {
    const newGenres = checked ? [...genres, genre] : genres.filter((g) => g !== genre);
    setValue("genres", newGenres.join(", "), { shouldValidate: true });
  };

  // Normalise "v1, 2" to "V1, V2" on blur; anything else is kept so its error shows
  const handleVolumesBlur = (e) => {
    const processedVolumes = splitList(e.target.value).map((volume) => {
      const match = volume.match(/^(?:[vV])?(\d+)$/);
      return match ? `V${match[1]}` : volume;
    });
    setValue("volumes", processedVolumes.join(", "), { shouldValidate: true });
  };

  const validateVolumes = (value) => {
    if (selectedCategory !== "comics") return true;
    if (value.trim() === "") return "Volume numbers are required for comics";

    const volumes = splitList(value);
    const volumeValidation = validateComicVolumes(volumes);
    if (!volumeValidation.valid) return volumeValidation.message;

    const uniqueVolumes = [...new Set(volumes.map((v) => v.toUpperCase()))];
    if (uniqueVolumes.length !== volumes.length) return "Duplicate volume numbers are not allowed";

    return true;
  };

  return (
    <div className={`space-y-4 comics-fields ${selectedCategory === "comics" ? "block" : "hidden"}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>Genres</label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => {
              const checked = genres.includes(genre);
              return (
                <label key={genre} className={`${CHIP_CLASS} ${checked ? CHIP_ON : CHIP_OFF}`}>
                  <input
                    type="checkbox"
                    value={genre}
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => toggleGenre(genre, e.target.checked)}
                  />
                  <span>{genre}</span>
                </label>
              );
            })}
          </div>
          <FieldError name="genres" />
        </div>

        <div>
          <label className={LABEL_CLASS}>Volume Numbers</label>
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="V1, V2, V10, ... (e.g. V1, V2, V10)"
            {...register("volumes", { validate: validateVolumes })}
            onBlur={handleVolumesBlur}
          />
          <FieldError name="volumes" />
        </div>
      </div>
    </div>
  );
};

export default ComicsFields;
