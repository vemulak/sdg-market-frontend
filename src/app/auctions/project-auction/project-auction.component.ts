import { Component, OnInit, Input, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiSellOfferService } from 'src/app/services/api/api-sell-offer.service';
import { ToastrService } from 'ngx-toastr';
import { SellOffer } from 'src/app/interfaces/sell-offer';
import { ApiPurchaseOfferService } from 'src/app/services/api/api-purchase-offer.service';
import { PurchaseOffer } from 'src/app/interfaces/purchase-offer';
import { Contribution } from 'src/app/interfaces/contribution';
import { GitProject } from 'src/app/interfaces/git-project';
import { GitProjectApiService } from 'src/app/services/api/git-project-api.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from 'src/app/auth/auth.service';

@Component({
  selector: 'app-project-auction',
  templateUrl: './project-auction.component.html',
  styleUrls: ['./project-auction.component.scss']
})
export class ProjectAuctionComponent implements OnInit {

  title = 'GitHub Trading';
  selectedTab = 1;
  public sellForm: FormGroup;
  public purchaseOfferForm: FormGroup;
  public buyForm: FormGroup;

  public projectId: number;
  public sellFormSubmitted = false;
  public purchaseOfferFormSubmitted = false;
  public buyFormSumitted = false;
  public currentSellFormBuying: SellOffer;

  public currentSales: Array<SellOffer> = null;
  public currentPurchaseOffers: Array<PurchaseOffer> = null;
  public currentContributions: Array<Contribution>;
  public currentProject: GitProject;

  @ViewChild('sellModalCloseButton') sellModalCloseButton: ElementRef;
  @ViewChild('purchaseOfferModalCloseButton') purchaseOfferModalCloseButton: ElementRef;

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private sellOfferApi: ApiSellOfferService,
    private purchaseOfferApi: ApiPurchaseOfferService, public toastr: ToastrService, public router: Router,
    private projecApi: GitProjectApiService, private sellApi: ApiSellOfferService, private modalService: NgbModal,
    private authService: AuthService) {
  }

  private generateSellingForm() {
    this.sellFormSubmitted = false;
    this.sellForm = this.fb.group({
      number_of_tokens: [1, [
        Validators.required
      ]],
      sell_price_per_token: [1, [
        Validators.required
      ]],
      project: [this.projectId, [
        Validators.required
      ]]
    });
  }

  private generateBuyForm(sellForm: number) {

    this.buyFormSumitted = false;
    this.buyForm = this.fb.group({
      nb_tokens: [0, [
        Validators.required
      ]],
      sell_offer: [sellForm, [
        Validators.required
      ]]
    });
  }

  private generatePurchaseOfferForm() {
    this.purchaseOfferFormSubmitted = false;

    this.purchaseOfferForm = this.fb.group({
      number_of_tokens: [1, [
        Validators.required
      ]],
      purchase_price_per_token: [1, [
        Validators.required
      ]],
      project: [this.projectId, [
        Validators.required
      ]]
    });
  }

  ngOnInit() {
    this.projectId = this.route.snapshot.params["id"];

    this.projecApi.get(this.projectId).toPromise().then(project => {
      this.currentProject = project;
    }).catch(err => {
      console.log(err);
    })

    this.generateSellingForm();
    this.generatePurchaseOfferForm();
    this.refreshSellOffer();
    this.refreshPurchasesOffer();
  }

  public refreshSellOffer() {
    this.sellOfferApi.getAll(this.projectId).toPromise().then(sales => {
      this.currentSales = sales;
      console.log("Selling offers", sales);
    });
  }

  public buyTokens(modalForm, sellOffer: SellOffer) {
    console.log("Offer selected", sellOffer, modalForm);
    this.modalService.open(modalForm);
    this.currentSellFormBuying = sellOffer;
    this.generateBuyForm(sellOffer.id);
  }

  public closeBuyModalForm() {
    this.modalService.dismissAll();
  }

  public refreshPurchasesOffer() {
    this.purchaseOfferApi.getAll(this.projectId).toPromise().then(purchasesOffer => {
      this.currentPurchaseOffers = purchasesOffer;
      console.log("Purchases offers", purchasesOffer);
    });
  }

  public onNbOfTokensToBuyChange(nbOfTokens: number, totalPriceField: HTMLInputElement) {
    let totalPrice = nbOfTokens * parseFloat(this.currentSellFormBuying.sell_price_per_token);
    totalPriceField.value = totalPrice.toFixed(2);
  }

  public submitSellForm() {
    const formValue = this.sellForm.value;

    this.sellFormSubmitted = true;
    if (this.sellForm.valid) {
      this.sellOfferApi.create(formValue).toPromise().then((data) => {
        this.sellModalCloseButton.nativeElement.click();
        this.generateSellingForm();
        this.refreshSellOffer();
        console.log("success", data);
        this.toastr.success("The data have been saved successfully", "Data saved");
      }).catch(error => {
        console.log(error);
        this.toastr.error("An error occurred while saving your data", error);
      });
    }
  }


  public submitBuyingForm() {
    const formValue = this.buyForm.value;

    this.buyFormSumitted = true;
    if (this.buyForm.valid) {
      this.sellApi.buy(formValue).toPromise().then((data) => {
        this.authService.refreshUser();
        this.sellModalCloseButton.nativeElement.click();
        this.closeBuyModalForm();
        this.refreshSellOffer();
        this.toastr.success("Your transaction is complete", "Transaction complete");
      }).catch(error => {
        console.log(error);
        this.toastr.error("An error occurred while saving your data", error);
        console.log("ERROR", error.error.errors.children);
        if (error.error && error.error.errors && error.error.errors.children && error.error.errors.children.nbTokens.errors) {
          console.log("there is an error");
          this.buyForm.get("nb_tokens").setErrors({
            "nbTokens": error.error.errors.children.nbTokens.errors.join("<br>")
          });
        }

      });
    }
  }


  public submitPurchaseOfferForm() {
    const formValue = this.purchaseOfferForm.value;
    this.purchaseOfferFormSubmitted = true;
    if (this.purchaseOfferForm.valid) {
      this.purchaseOfferApi.create(formValue).toPromise().then((data) => {
        this.purchaseOfferModalCloseButton.nativeElement.click();
        this.generatePurchaseOfferForm();
        this.refreshPurchasesOffer();
        this.toastr.success("The data have been saved successfully", "Data saved");
      }).catch(error => {
        console.log(error);
        this.toastr.error("An error occurred while saving your data", error);
      });
    }

  }

}
