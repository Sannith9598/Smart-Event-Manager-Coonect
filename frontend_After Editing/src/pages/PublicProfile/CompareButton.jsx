import { FaBalanceScale, FaCheck } from "react-icons/fa";
import { toast } from "react-toastify";

// Button that adds a manager to the comparison list (max 5)
export default function CompareButton({ profile, compareList, onCompare }) {
  if (!profile) return null;

  const isInList = compareList.some(m => m.id === profile.id);
  const isFull = compareList.length >= 5;

  const handleClick = () => {
    if (isInList) return;
    if (isFull) {
      toast.warning("Maximum comparison limit reached (5 managers). Remove one to add another.");
      return;
    }
    onCompare({
      id: profile.id,
      businessName: profile.businessName,
      profilePhoto: profile.profilePhoto,
      rating: profile.rating,
      totalReviews: profile.totalReviews,
      yearsOfExperience: profile.yearsOfExperience,
      serviceAreas: profile.serviceAreas,
      businessTypes: profile.businessTypes,
      totalPastEvents: profile.totalPastEvents
    });
  };

  return (
    <button
      className={`btn btn-sm ${isInList ? 'btn-success' : 'btn-outline-secondary'}`}
      onClick={handleClick}
      disabled={isInList}
      title={isInList ? "Already in comparison" : isFull ? "Max 5 managers" : "Add to comparison"}
    >
      {isInList ? <><FaCheck /> In Comparison</> : <><FaBalanceScale /> Compare</>}
    </button>
  );
}
