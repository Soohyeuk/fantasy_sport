import { atom, selector } from 'recoil';

export const selectedSportAtom = atom({
  key: 'selectedSport',
  default: 'Sports',
});

export const changedSportSelector = selector({
  key: 'changedSports',
  get: ({get}) => {
    const sport = get(selectedSportAtom);

    switch (sport) {
      case 'Sports':
        return "undefined";
      case 'Soccer':
        return "SB";
      case 'Baseball':
        return "BB";
      case 'Basketball':
        return "BKB";
      case 'Football':
        return "FTB";
      default:
        return sport;
    }
  },
});