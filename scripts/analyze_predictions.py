#!/usr/bin/env python3
"""
Lottery Prediction Analyzer

This script analyzes prediction accuracy by comparing suggested tickets
against actual lottery results. It provides insights into which strategies
perform better over time.

Usage:
    python scripts/analyze_predictions.py [--update YYYY-MM-DD n1,n2,n3,n4,n5,n6,n7]

Examples:
    # Show analysis of all predictions
    python scripts/analyze_predictions.py

    # Update a prediction with actual result
    python scripts/analyze_predictions.py --update 2025-12-06 3,7,10,14,19,23,27
"""

import json
import argparse
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Paths
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data"
PREDICTIONS_FILE = DATA_DIR / "predictions.json"
HISTORY_FILE = DATA_DIR / "history.json"


def load_json(filepath: Path) -> list:
    """Load JSON file, return empty list if not found."""
    if not filepath.exists():
        return []
    with open(filepath, "r") as f:
        return json.load(f)


def save_json(filepath: Path, data: list) -> None:
    """Save data to JSON file with pretty formatting."""
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)
    print(f"✓ Saved to {filepath}")


def calculate_matches(predicted: list[int], actual: list[int]) -> dict:
    """Calculate matching numbers between prediction and actual result."""
    predicted_set = set(predicted)
    actual_set = set(actual)
    matched = sorted(predicted_set & actual_set)
    return {
        "matched_numbers": matched,
        "match_count": len(matched),
        "predicted": predicted,
        "actual": actual
    }


def evaluate_prediction(prediction: dict, actual_numbers: list[int]) -> dict:
    """Evaluate all tickets in a prediction against actual result."""
    ticket_results = []
    total_matches = 0
    best_match = 0
    
    for ticket in prediction["tickets"]:
        result = calculate_matches(ticket["numbers"], actual_numbers)
        result["game"] = ticket["game"]
        result["strategy"] = ticket["strategy"]
        ticket_results.append(result)
        total_matches += result["match_count"]
        best_match = max(best_match, result["match_count"])
    
    return {
        "actual_result": actual_numbers,
        "evaluated_at": datetime.now().isoformat(),
        "ticket_results": ticket_results,
        "summary": {
            "total_tickets": len(prediction["tickets"]),
            "total_matches": total_matches,
            "average_matches": round(total_matches / len(prediction["tickets"]), 2),
            "best_match": best_match
        }
    }


def update_prediction_result(target_date: str, actual_numbers: list[int]) -> bool:
    """Update a prediction with the actual lottery result."""
    predictions = load_json(PREDICTIONS_FILE)
    
    updated = False
    for pred in predictions:
        if pred["target_draw_date"] == target_date:
            pred["actual_result"] = actual_numbers
            pred["evaluation"] = evaluate_prediction(pred, actual_numbers)
            updated = True
            print(f"✓ Updated prediction for {target_date}")
            break
    
    if updated:
        save_json(PREDICTIONS_FILE, predictions)
    else:
        print(f"✗ No prediction found for target date: {target_date}")
    
    return updated


def analyze_strategies(predictions: list) -> dict:
    """Analyze which strategies perform best across all evaluated predictions."""
    strategy_stats = defaultdict(lambda: {"total_matches": 0, "count": 0, "examples": []})
    
    for pred in predictions:
        if pred.get("evaluation") is None:
            continue
        
        for ticket in pred["evaluation"]["ticket_results"]:
            strategy = ticket["strategy"]
            matches = ticket["match_count"]
            
            # Categorize strategy
            if "cold-heavy" in strategy.lower() or "overdue" in strategy.lower():
                category = "cold-focused"
            elif "hot-heavy" in strategy.lower() or "hot +" in strategy.lower():
                category = "hot-focused"
            else:
                category = "balanced"
            
            strategy_stats[category]["total_matches"] += matches
            strategy_stats[category]["count"] += 1
            if matches >= 3:
                strategy_stats[category]["examples"].append({
                    "date": pred["target_draw_date"],
                    "game": ticket["game"],
                    "matches": matches,
                    "matched": ticket["matched_numbers"]
                })
    
    # Calculate averages
    for category in strategy_stats:
        stats = strategy_stats[category]
        if stats["count"] > 0:
            stats["average"] = round(stats["total_matches"] / stats["count"], 2)
    
    return dict(strategy_stats)


def print_prediction_summary(pred: dict) -> None:
    """Print a summary of a single prediction."""
    print(f"\n{'='*60}")
    print(f"Prediction: {pred['prediction_date']} → Target: {pred['target_draw_date']}")
    print(f"Based on {pred['based_on_draws']} historical draws")
    print(f"{'='*60}")
    
    if pred.get("evaluation") is None:
        print("⏳ Awaiting result...")
        print("\nTickets suggested:")
        for ticket in pred["tickets"]:
            print(f"  Game {ticket['game']}: {ticket['numbers']}")
        return
    
    eval_data = pred["evaluation"]
    summary = eval_data["summary"]
    
    print(f"\n🎯 Actual Result: {eval_data['actual_result']}")
    print(f"\n📊 Summary:")
    print(f"   Best match: {summary['best_match']}/7 numbers")
    print(f"   Average matches: {summary['average_matches']}/7")
    print(f"   Total matches across {summary['total_tickets']} tickets: {summary['total_matches']}")
    
    print(f"\n📋 Ticket Results:")
    for ticket in sorted(eval_data["ticket_results"], key=lambda x: -x["match_count"]):
        match_display = "🔥" if ticket["match_count"] >= 3 else "  "
        print(f"   {match_display} Game {ticket['game']}: {ticket['match_count']}/7 matched {ticket['matched_numbers']}")
        print(f"      Strategy: {ticket['strategy']}")


def print_overall_analysis(predictions: list) -> None:
    """Print overall analysis across all predictions."""
    evaluated = [p for p in predictions if p.get("evaluation") is not None]
    
    if not evaluated:
        print("\n📈 No evaluated predictions yet. Update with actual results to see analysis.")
        return
    
    print(f"\n{'='*60}")
    print("📈 OVERALL ANALYSIS")
    print(f"{'='*60}")
    
    total_tickets = sum(p["evaluation"]["summary"]["total_tickets"] for p in evaluated)
    total_matches = sum(p["evaluation"]["summary"]["total_matches"] for p in evaluated)
    best_ever = max(p["evaluation"]["summary"]["best_match"] for p in evaluated)
    
    print(f"\nPrediction sessions evaluated: {len(evaluated)}")
    print(f"Total tickets analyzed: {total_tickets}")
    print(f"Total number matches: {total_matches}")
    print(f"Overall average: {round(total_matches / total_tickets, 2)}/7 per ticket")
    print(f"Best single ticket: {best_ever}/7 matches")
    
    # Strategy analysis
    strategy_stats = analyze_strategies(evaluated)
    if strategy_stats:
        print(f"\n🎯 Strategy Performance:")
        for category, stats in sorted(strategy_stats.items(), key=lambda x: -x[1].get("average", 0)):
            print(f"   {category}: avg {stats.get('average', 0)}/7 ({stats['count']} tickets)")
            for example in stats.get("examples", [])[:2]:
                print(f"      └─ Game {example['game']} on {example['date']}: {example['matches']} matches")


def main():
    parser = argparse.ArgumentParser(description="Analyze lottery predictions")
    parser.add_argument("--update", nargs=2, metavar=("DATE", "NUMBERS"),
                        help="Update prediction with actual result. DATE: YYYY-MM-DD, NUMBERS: comma-separated")
    args = parser.parse_args()
    
    if args.update:
        target_date, numbers_str = args.update
        try:
            numbers = [int(n.strip()) for n in numbers_str.split(",")]
            if len(numbers) != 7:
                print("Error: Must provide exactly 7 numbers")
                return
            if not all(1 <= n <= 28 for n in numbers):
                print("Error: All numbers must be between 1 and 28")
                return
            if len(set(numbers)) != 7:
                print("Error: All numbers must be distinct")
                return
            update_prediction_result(target_date, sorted(numbers))
        except ValueError:
            print("Error: Invalid number format. Use comma-separated integers.")
            return
    
    # Load and display predictions
    predictions = load_json(PREDICTIONS_FILE)
    
    if not predictions:
        print("No predictions found in data/predictions.json")
        return
    
    for pred in predictions:
        print_prediction_summary(pred)
    
    print_overall_analysis(predictions)
    
    print(f"\n{'─'*60}")
    print("💡 To update with actual result:")
    print("   python scripts/analyze_predictions.py --update 2025-12-06 3,7,10,14,19,23,27")


if __name__ == "__main__":
    main()


