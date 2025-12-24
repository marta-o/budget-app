"""
Test script for ML predictions.
Compares predictions against actual spending data.

Dataset: 2025-01 to 2026-06
Training data: 2025-01 to 2026-02  
Test data: 2026-03 to 2026-06
"""
import sqlite3
from datetime import datetime
from app.user_predictor import UserMLPredictor
from app.config import settings


def get_actual_spending(person_id: int, year: int, month: int, category: str) -> float:
    """Get actual spending for a specific month and category."""
    db_path = settings.SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT COALESCE(SUM(t.amount), 0)
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.person_id = ?
        AND strftime('%Y', t.date) = ?
        AND strftime('%m', t.date) = ?
        AND c.name = ?
        AND c.type = 'expense'
    """, (person_id, str(year), f"{month:02d}", category))
    
    result = cursor.fetchone()[0]
    conn.close()
    return float(result) if result else 0.0


def test_predictions_for_user(person_id: int, test_months: list):
    """
    Test ML predictions against actual data for a user.
    
    Args:
        person_id: User ID to test
        test_months: List of (year, month) tuples to test
    """
    predictor = UserMLPredictor()
    
    # Get user summary
    summary = predictor.get_user_summary(person_id)
    print(f"\n{'='*60}")
    print(f"User {person_id}: {summary['total_transactions']} transactions")
    print(f"ML Active: {summary['uses_ml']}")
    if summary['model_metrics']:
        print(f"Model R²: {summary['model_metrics']['r2']:.4f}")
        print(f"Model MAE: {summary['model_metrics']['mae']:.2f} zł")
    print(f"{'='*60}\n")
    
    # Get categories
    db_path = settings.SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM categories WHERE type = 'expense'")
    categories = [r[0] for r in cursor.fetchall()]
    conn.close()
    
    total_error = 0
    total_predictions = 0
    results = []
    
    for year, month in test_months:
        month_name = ["", "Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", 
                      "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"][month]
        
        for category in categories:
            # Get prediction
            pred = predictor.predict_for_month(person_id, category, month)
            predicted = pred['estimated_amount']
            
            # Get actual
            actual = get_actual_spending(person_id, year, month, category)
            
            if actual > 0 or predicted > 0:
                error = abs(predicted - actual)
                error_pct = (error / actual * 100) if actual > 0 else 0
                
                results.append({
                    'month': f"{month_name} {year}",
                    'category': category,
                    'predicted': predicted,
                    'actual': actual,
                    'error': error,
                    'error_pct': error_pct,
                    'is_ml': pred.get('is_ml', False)
                })
                
                total_error += error
                total_predictions += 1
    
    # Print results sorted by error
    results.sort(key=lambda x: x['error'], reverse=True)
    
    print(f"{'Miesiąc':<12} {'Kategoria':<20} {'Predykcja':>12} {'Rzeczywiste':>12} {'Błąd':>10} {'ML'}")
    print("-" * 80)
    
    for r in results[:20]:  # Top 20 by error
        ml_tag = "🤖" if r['is_ml'] else "📊"
        print(f"{r['month']:<12} {r['category']:<20} {r['predicted']:>10.2f} zł {r['actual']:>10.2f} zł {r['error']:>8.2f} zł {ml_tag}")
    
    # Summary
    if total_predictions > 0:
        mae = total_error / total_predictions
        print(f"\n{'='*60}")
        print(f"Średni błąd absolutny (MAE): {mae:.2f} zł")
        print(f"Liczba predykcji: {total_predictions}")
        print(f"{'='*60}")


def main():
    """Run prediction tests."""
    print("=" * 60)
    print("TEST PREDYKCJI ML")
    print("Dane treningowe: 2025-01 do 2026-02")
    print("Dane testowe: 2026-03 do 2026-06")
    print("=" * 60)
    
    # Test months (March to June 2026)
    test_months = [
        (2026, 3),  # Marzec
        (2026, 4),  # Kwiecień
        (2026, 5),  # Maj
        (2026, 6),  # Czerwiec
    ]
    
    # Test for users with most data
    test_users = [6, 8, 15, 24, 38]
    
    for user_id in test_users:
        test_predictions_for_user(user_id, test_months)


if __name__ == "__main__":
    main()
