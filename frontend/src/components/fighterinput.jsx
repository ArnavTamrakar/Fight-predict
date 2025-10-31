import { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

export default function FighterInput({ label, onSelect, apiBase }) {
  const [fighterNames, setFighterNames] = useState([]);

  useEffect(() => {
    fetch(`${apiBase}/api/fighters`)
      .then(res => res.json())
      .then(data => setFighterNames(data))
      .catch(err => console.error(err));
  }, [apiBase]);

  return (
    <Autocomplete
      options={fighterNames}
      onChange={(_event, newValue) => onSelect(newValue)}
      renderInput={params => <TextField {...params} label={label} variant="outlined" />}
    />
  );
}