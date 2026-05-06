import React from 'react';
import styles from './CSVPreview.module.css';

export default function CSVPreview({ data, loading, error }) {
  if (loading) {
    return <div className={styles.loading}>Processing CSV...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h3>Uploaded Students ({data.length})</h3>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {data.map((student, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{student.name}</td>
                <td>{student.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
