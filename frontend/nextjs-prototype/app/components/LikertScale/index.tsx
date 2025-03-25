import { useEffect, useState } from 'react';
import styles from './LikertScale.module.css';

interface LikertScaleProps {
  criterionId: number;
  criterionName: string;
  onEvaluate: (criterionId: number, variableId: number) => void;
  initialValue?: number;
}

interface LinguisticVariable {
  id: number;
  name: string;
  value: number;
  description: string;
  order_index: number;
}

const LikertScale: React.FC<LikertScaleProps> = ({
  criterionId,
  criterionName,
  onEvaluate,
  initialValue
}) => {
  const [variables, setVariables] = useState<LinguisticVariable[]>([]);
  const [selectedValue, setSelectedValue] = useState<number | undefined>(initialValue);

  useEffect(() => {
    setSelectedValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const fetchVariables = async () => {
      try {
        const res = await fetch('http://localhost:9000/linguistic-variables/', {
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch linguistic variables');
        const data = await res.json();
        setVariables(data.sort((a: LinguisticVariable, b: LinguisticVariable) => 
          a.order_index - b.order_index
        ));
      } catch (error) {
        console.error('Error fetching linguistic variables:', error);
      }
    };

    fetchVariables();
  }, []);

  const handleSelect = (variableId: number) => {
    setSelectedValue(variableId);
    onEvaluate(criterionId, variableId);
  };

  if (!variables.length) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.criterionName}>{criterionName}</div>
      <div className={styles.scaleContainer}>
        {variables.map((variable) => (
          <div key={variable.id} className={styles.optionContainer}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name={`criterion-${criterionId}`}
                value={variable.id}
                checked={selectedValue === variable.id}
                onChange={() => handleSelect(variable.id)}
                className={styles.radioInput}
              />
              <span className={styles.customRadio} />
              <span className={styles.labelText}>{variable.name}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LikertScale;
