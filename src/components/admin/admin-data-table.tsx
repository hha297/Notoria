import type { ReactNode } from "react";
import styles from "@/components/style/admin/admin.module.css";
import { mx } from "@/lib/css-module";

export type AdminDataColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

type AdminDataTableProps<T> = {
  columns: AdminDataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: string;
};

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
}: AdminDataTableProps<T>) {
  if (rows.length === 0) {
    return <p className={mx(styles, "admin-empty")}>{empty}</p>;
  }

  return (
    <div className={mx(styles, "admin-table-wrap")}>
      <table className={mx(styles, "admin-table")}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td key={col.key} className={col.className}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
